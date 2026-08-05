'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function VideoCallOverlay({
  currentUserId,
  targetUserId,
  callType,
  onClose
}: {
  currentUserId: string
  targetUserId: string
  callType: 'audio' | 'video'
  onClose: () => void
}) {
  const supabase = createClient()
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio')

  useEffect(() => {
    if (!targetUserId) return

    let isMounted = true
    const servers = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
    const pc = new RTCPeerConnection(servers)
    peerConnectionRef.current = pc

    const channel = supabase.channel(`call_${targetUserId}`)

    // Získání kamery a mikrofonu
    navigator.mediaDevices
      .getUserMedia({ video: callType === 'video', audio: true })
      .then((stream) => {
        // Ochrana před zápisem do uzavřeného spojení
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
      })
      .catch((err) => {
        console.error('Chyba při přístupu k médiím:', err)
      })

    pc.ontrack = (event) => {
      if (remoteVideoRef.current && event.streams[0]) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && pc.signalingState !== 'closed') {
        channel.send({
          type: 'broadcast',
          event: 'ice-candidate',
          payload: event.candidate
        })
      }
    }

    channel
      .on('broadcast', { event: 'offer' }, async ({ payload }) => {
        if (pc.signalingState === 'closed') return
        await pc.setRemoteDescription(new RTCSessionDescription(payload))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        channel.send({ type: 'broadcast', event: 'answer', payload: answer })
      })
      .on('broadcast', { event: 'answer' }, async ({ payload }) => {
        if (pc.signalingState === 'closed') return
        await pc.setRemoteDescription(new RTCSessionDescription(payload))
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }) => {
        if (pc.signalingState === 'closed') return
        await pc.addIceCandidate(new RTCIceCandidate(payload))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && pc.signalingState !== 'closed') {
          const offer = await pc.createOffer()
          await pc.setLocalDescription(offer)
          channel.send({ type: 'broadcast', event: 'offer', payload: offer })
        }
      })

    return () => {
      isMounted = false

      // Zastavení kamery/mikrofonu při ukončení hovoru
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop())
      }

      pc.close()
      supabase.removeChannel(channel)
    }
  }, [callType, targetUserId])

  return (
    <div className="fixed inset-0 z-[200] bg-slate-950 flex flex-col items-center justify-between p-6">
      <div className="relative w-full flex-1 rounded-3xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center">
        <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <video ref={localVideoRef} autoPlay playsInline muted className="absolute top-4 right-4 w-28 h-40 object-cover rounded-2xl border-2 border-white shadow-xl" />
      </div>

      {/* Ovládací panely hovoru */}
      <div className="flex gap-6 mt-6 items-center">
        <button
          onClick={() => {
            if (localStreamRef.current) {
              const audioTrack = localStreamRef.current.getAudioTracks()[0]
              if (audioTrack) {
                audioTrack.enabled = isMuted
                setIsMuted(!isMuted)
              }
            }
          }}
          className={`p-4 rounded-full text-xl ${isMuted ? 'bg-rose-600' : 'bg-slate-800'}`}
        >
          {isMuted ? '🎙️❌' : '🎙️'}
        </button>

        <button onClick={onClose} className="p-5 bg-rose-600 rounded-full text-2xl shadow-lg hover:scale-110">
          📞❌
        </button>

        {callType === 'video' && (
          <button
            onClick={() => {
              if (localStreamRef.current) {
                const videoTrack = localStreamRef.current.getVideoTracks()[0]
                if (videoTrack) {
                  videoTrack.enabled = isVideoOff
                  setIsVideoOff(!isVideoOff)
                }
              }
            }}
            className={`p-4 rounded-full text-xl ${isVideoOff ? 'bg-rose-600' : 'bg-slate-800'}`}
          >
            {isVideoOff ? '📹❌' : '📹'}
          </button>
        )}
      </div>
    </div>
  )
}