'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Profile {
  id: string
  username: string
  avatar_url: string
}

interface CallModalProps {
  currentUserId: string
  targetUser: Profile
  callType: 'audio' | 'video'
  isCaller: boolean
  onClose: () => void
}

const ICE_SERVERS = {
  iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]
}

export default function CallModal({ currentUserId, targetUser, callType, isCaller, onClose }: CallModalProps) {
  const supabase = createClient()
  const [callStatus, setCallStatus] = useState<'ringing' | 'connected' | 'ended'>(isCaller ? 'ringing' : 'connected')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)

  const roomId = isCaller ? `call_${currentUserId}_${targetUser.id}` : `call_${targetUser.id}_${currentUserId}`

  const cleanupCall = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop())
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    supabase.channel(roomId).unsubscribe()
  }, [roomId, supabase])

  useEffect(() => {
    const channel = supabase.channel(roomId, {
      config: { broadcast: { self: false } }
    })

    const setupWebRTC = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: callType === 'video',
          audio: true
        })
        localStreamRef.current = stream

        if (localVideoRef.current && callType === 'video') {
          localVideoRef.current.srcObject = stream
        }

        const pc = new RTCPeerConnection(ICE_SERVERS)
        peerConnectionRef.current = pc

        stream.getTracks().forEach(track => pc.addTrack(track, stream))

        pc.ontrack = (event) => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0]
          }
          setCallStatus('connected')
        }

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            channel.send({
              type: 'broadcast',
              event: 'ice-candidate',
              payload: { candidate: event.candidate }
            })
          }
        }

        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
          if (payload.candidate && peerConnectionRef.current) {
            try {
              await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
            } catch (e) {
              console.error('Chyba při přidávání ICE kandidáta:', e)
            }
          }
        })

        if (isCaller) {
          channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              const offer = await pc.createOffer()
              await pc.setLocalDescription(offer)
              channel.send({
                type: 'broadcast',
                event: 'offer',
                payload: { offer }
              })
            }
          })

          channel.on('broadcast', { event: 'answer' }, async ({ payload }) => {
            if (payload.answer && peerConnectionRef.current) {
              await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(payload.answer))
              setCallStatus('connected')
            }
          })
        } else {
          channel.on('broadcast', { event: 'offer' }, async ({ payload }) => {
            if (payload.offer && peerConnectionRef.current) {
              await pc.setRemoteDescription(new RTCSessionDescription(payload.offer))
              const answer = await pc.createAnswer()
              await pc.setLocalDescription(answer)
              channel.send({
                type: 'broadcast',
                event: 'answer',
                payload: { answer }
              })
              setCallStatus('connected')
            }
          })

          channel.subscribe()
        }

        channel.on('broadcast', { event: 'hangup' }, () => {
          setCallStatus('ended')
          cleanupCall()
          setTimeout(onClose, 1500)
        })

      } catch (err: any) {
        console.error('Chyba přístupu ke kameře/mikrofonu:', err)
        setErrorMessage('Nelze získat přístup ke kameře nebo mikrofonu.')
      }
    }

    setupWebRTC()

    return () => {
      cleanupCall()
    }
  }, [callType, isCaller, roomId, supabase, cleanupCall, onClose])

  const handleHangup = () => {
    const channel = supabase.channel(roomId)
    channel.send({
      type: 'broadcast',
      event: 'hangup',
      payload: {}
    })
    setCallStatus('ended')
    cleanupCall()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center select-none p-4">
      <div className="relative w-full max-w-2xl h-[80vh] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between border border-slate-800">
        
        {/* HORNÍ LIŠTA */}
        <div className="absolute top-0 inset-x-0 z-20 p-6 flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white/20 bg-slate-800 flex items-center justify-center">
              {targetUser.avatar_url ? (
                <img src={targetUser.avatar_url} alt={targetUser.username} className="w-full h-full object-cover" />
              ) : (
                <span>🐾</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-bold text-sm">{targetUser.username}</h3>
              <p className="text-xs text-white/60">
                {callStatus === 'ringing' && 'Vyzvánění...'}
                {callStatus === 'connected' && 'Probíhá hovor'}
                {callStatus === 'ended' && 'Hovor ukončen'}
              </p>
            </div>
          </div>
        </div>

        {/* HLAVNÍ PLOCHA (VIDEO / PROFILOVKA) */}
        <div className="relative w-full h-full flex items-center justify-center bg-slate-950 overflow-hidden">
          {callType === 'video' ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-24 right-6 w-28 h-40 object-cover rounded-2xl border-2 border-white/20 shadow-lg bg-slate-900" />
            </>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-500/50 shadow-2xl animate-pulse">
                {targetUser.avatar_url ? (
                  <img src={targetUser.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl">🐾</span>
                )}
              </div>
              <span className="text-white font-semibold text-base">{targetUser.username}</span>
            </div>
          )}

          {errorMessage && (
            <div className="absolute inset-0 bg-slate-900/90 flex items-center justify-center p-6 text-center text-rose-400 text-xs font-semibold">
              {errorMessage}
            </div>
          )}
        </div>

        {/* SPODNÍ OVLÁDÁNÍ */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-6 flex justify-center items-center gap-6 bg-gradient-to-t from-black/90 to-transparent">
          <button
            onClick={handleHangup}
            className="w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-xl transition active:scale-95"
            title="Zavěsit"
          >
            📞
          </button>
        </div>

      </div>
    </div>
  )
}