'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function VideoCallOverlay({
  currentUserId,
  targetUserId,
  callType,
  isCaller,
  targetUserAvatar,
  targetUserName,
  onClose
}: {
  currentUserId: string
  targetUserId: string
  callType: 'audio' | 'video'
  isCaller: boolean
  targetUserAvatar?: string
  targetUserName?: string
  onClose: () => void
}) {
  const supabase = createClient()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio')
  const [remoteVideoOff, setRemoteVideoOff] = useState(false)
  const [callStatus, setCallStatus] = useState('Propojování...')
  const [isConnected, setIsConnected] = useState(false)

  const roomId = [currentUserId, targetUserId].sort().join('_')

  // Bezpečné ukončení hovoru a úklid
  const handleCleanupAndClose = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!targetUserId) return

    let isMounted = true
    const servers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    }

    const pc = new RTCPeerConnection(servers)
    peerConnectionRef.current = pc

    const channel = supabase.channel(`room_${roomId}`, {
      config: { broadcast: { self: false } }
    })

    // Sledování stavu WebRTC připojení
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        handleCleanupAndClose()
      }
    }

    // 1. Příjem vzdáleného videa/audio streamu
    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
        setCallStatus('Spojeno')
        setIsConnected(true)
        
        event.streams[0].getVideoTracks().forEach(track => {
          setRemoteVideoOff(!track.enabled)
          track.onunmute = () => setRemoteVideoOff(false)
          track.onmute = () => setRemoteVideoOff(true)
        })
      }
    }

    // 2. ICE kandidáti
    pc.onicecandidate = (event) => {
      if (event.candidate && pc.signalingState !== 'closed') {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: event.candidate
        })
      }
    }

    // 3. Nastavení posluchačů signalizace před samotným přihlášením do kanálu
    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (!isCaller && pc.signalingState === 'stable') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload))
            const answer = await pc.createAnswer()
            await pc.setLocalDescription(answer)
            channel.send({ type: 'broadcast', event: 'answer', payload: answer })
          } catch (e) {
            console.error('Chyba při zpracování offeru:', e)
          }
        }
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (isCaller && pc.signalingState === 'have-local-offer') {
          try {
            await pc.setRemoteDescription(new RTCSessionDescription(payload))
            setIsConnected(true)
            setCallStatus('Spojeno')
          } catch (e) {
            console.error('Chyba při zpracování answeru:', e)
          }
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pc.signalingState !== 'closed' && payload) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(payload))
          } catch (e) {
            console.error('Chyba při přidávání ICE:', e)
          }
        }
      })
      .on('broadcast', { event: 'hangup' }, () => {
        handleCleanupAndClose()
      })

    // 4. Inicializace médií a následné přihlášení do kanálu
    navigator.mediaDevices
      .getUserMedia({ video: callType === 'video', audio: true })
      .then((stream) => {
        if (!isMounted || pc.signalingState === 'closed') {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        localStreamRef.current = stream
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        stream.getTracks().forEach((track) => {
          if (pc.signalingState !== 'closed') {
            pc.addTrack(track, stream)
          }
        })

        // Přihlášení do kanálu až po načtení médií
        channel.subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            setCallStatus(isCaller ? 'Vyzvánění...' : 'Příchozí hovor...')

            // Volající vytvoří offer AŽ POTÉ, co je jisté, že je v kanálu přihlášený
            if (isCaller && pc.signalingState === 'stable') {
              try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                channel.send({ type: 'broadcast', event: 'offer', payload: offer })
              } catch (e) {
                console.error('Chyba při vytváření offeru:', e)
              }
            }
          }
        })
      })
      .catch((err) => {
        console.error('Chyba přístupu ke kameře/mikrofonu:', err)
        setCallStatus('Chyba přístupu k zařízení')
      })

    return () => {
      isMounted = false
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }
      pc.close()
      supabase.removeChannel(channel)
    }
  }, [callType, targetUserId, isCaller, roomId, supabase, handleCleanupAndClose])

  const handleHangupClick = () => {
    // Odeslání informací o zavěšení druhé straně před uzavřením okna
    const channel = supabase.channel(`room_${roomId}`)
    channel.send({ type: 'broadcast', event: 'hangup', payload: {} })
    handleCleanupAndClose()
  }

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = isVideoOff
        setIsVideoOff(!isVideoOff)
      }
    }
  }

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
        setIsMuted(!isMuted)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-between p-6 select-none">
      
      {/* Horní stavový řádek */}
      <div className="absolute top-6 z-20 px-5 py-2.5 rounded-full bg-slate-900/90 border border-slate-800 text-white text-xs font-bold backdrop-blur-xl shadow-2xl flex items-center gap-2.5">
        <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'}`} />
        <span>{callStatus}</span>
        {targetUserName && <span className="text-slate-400 font-medium">({targetUserName})</span>}
      </div>

      {/* Hlavní plocha hovoru / Vyzvánění */}
      <div className="relative w-full flex-1 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800/80 flex items-center justify-center mt-14 shadow-2xl">
        
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center p-8 space-y-6 animate-fadeIn">
            <div className="relative">
              <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 opacity-30 blur-xl animate-ping" />
              <div className="absolute -inset-4 rounded-full bg-indigo-500/20 blur-md animate-pulse" />
              
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden border-4 border-purple-500/80 shadow-2xl bg-slate-800 flex items-center justify-center">
                {targetUserAvatar ? (
                  <img src={targetUserAvatar} alt={targetUserName || 'Uživatel'} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-5xl">🐶</span>
                )}
              </div>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-white font-black text-2xl sm:text-3xl tracking-tight">{targetUserName || 'Neznámý uživatel'}</h2>
              <p className="text-purple-400 text-xs sm:text-sm font-semibold tracking-wide uppercase">
                {callType === 'video' ? '📹 Videohovor • Vyzvánění...' : '📞 Audio hovor • Vyzvánění...'}
              </p>
            </div>
          </div>
        ) : (
          <>
            {callType === 'video' && !remoteVideoOff ? (
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 space-y-4">
                <div className="relative w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-purple-500 shadow-2xl bg-slate-800 flex items-center justify-center">
                  {targetUserAvatar ? (
                    <img src={targetUserAvatar} alt={targetUserName || 'Uživatel'} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">🐱</span>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="text-white font-extrabold text-lg sm:text-xl">{targetUserName || 'Uživatel'}</h3>
                  <p className="text-slate-400 text-xs mt-1">
                    {callType === 'audio' ? 'Probíhá audio hovor 🎙️' : 'Kamera protistrany je vypnutá 🚫'}
                  </p>
                </div>
              </div>
            )}

            {callType === 'video' && !isVideoOff && (
              <div className="absolute top-4 right-4 w-28 h-40 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-white/80 shadow-2xl bg-slate-950">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              </div>
            )}
          </>
        )}
      </div>

      {/* Ovládací panel hovoru */}
      <div className="flex gap-6 mt-6 items-center z-20">
        <button
          onClick={toggleAudio}
          className={`p-4 rounded-full text-xl transition-all shadow-xl ${isMuted ? 'bg-rose-600 text-white' : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700'}`}
          title={isMuted ? 'Zapnout mikrofon' : 'Vypnout mikrofon'}
        >
          {isMuted ? '🎤❌' : '🎤'}
        </button>

        <button 
          onClick={handleHangupClick} 
          className="p-5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-full text-2xl shadow-2xl hover:scale-110 transition-all cursor-pointer"
          title="Ukončit hovor"
        >
          📴
        </button>

        {callType === 'video' && (
          <button
            onClick={toggleVideo}
            className={`p-4 rounded-full text-xl transition-all shadow-xl ${isVideoOff ? 'bg-rose-600 text-white' : 'bg-slate-800/90 text-white hover:bg-slate-700 border border-slate-700'}`}
            title={isVideoOff ? 'Zapnout kameru' : 'Vypnout kameru'}
          >
            {isVideoOff ? '📷❌' : '📸'}
          </button>
        )}
      </div>
    </div>
  )
}