'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export type Profile = {
  id: string
  username: string
  avatar_url?: string
}

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  media_url?: string
  created_at: string
}

export type Contact = Profile & {
  lastMessage?: string
  lastMessageTime?: string
}

export function useChatUsers(activeUserId?: string | null) {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const fetchContacts = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        if (router) router.push('/login')
        setLoadingContacts(false)
        return
      }
      setCurrentUserId(user.id)

      const { data: msgs } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')

      if (msgs && profiles) {
        const contactMap = new Map<string, Contact>()

        msgs.forEach((msg) => {
          const otherId = msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
          if (!contactMap.has(otherId)) {
            const profile = profiles.find((p) => p.id === otherId)
            if (profile) {
              contactMap.set(otherId, {
                ...profile,
                lastMessage: msg.content,
                lastMessageTime: msg.created_at
              })
            }
          }
        })

        if (activeUserId && !contactMap.has(activeUserId)) {
          const profile = profiles.find((p) => p.id === activeUserId)
          if (profile) contactMap.set(activeUserId, profile)
        }

        setContacts(Array.from(contactMap.values()))
      }
      setLoadingContacts(false)
    }

    fetchContacts()
  }, [activeUserId, router])

  return { contacts, loadingContacts, currentUserId }
}

function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeUserId = searchParams.get('userId')

  const { contacts, loadingContacts, currentUserId } = useChatUsers(activeUserId)

  const [searchQuery, setSearchQuery] = useState('')
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [uploadingImage, setUploadingImage] = useState(false)

  // Indikátor psaní
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // WebRTC / Hovory
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const pendingCallSignal = useRef<any>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Načtení profilu
  useEffect(() => {
    if (!activeUserId) {
      setActiveProfile(null)
      return
    }
    const fetchActiveProfile = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', activeUserId)
        .single()

      if (data) setActiveProfile(data)
    }
    fetchActiveProfile()
  }, [activeUserId])

  // Načtení zpráv
  useEffect(() => {
    if (!currentUserId || !activeUserId) return
    const loadMessages = async () => {
      setLoadingMessages(true)
      const supabase = createClient()
      const { data: chatMsgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (chatMsgs) setMessages(chatMsgs as Message[])
      setLoadingMessages(false)
      scrollToBottom()
    }
    loadMessages()
  }, [activeUserId, currentUserId])

  // Realtime (Zprávy, Online, WebRTC, Psaní)
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const msgChannel = supabase.channel('global-chat')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message
        if (
          (newMsg.sender_id === currentUserId && newMsg.receiver_id === activeUserId) ||
          (newMsg.sender_id === activeUserId && newMsg.receiver_id === currentUserId)
        ) {
          setMessages((prev) => [...prev, newMsg])
          scrollToBottom()
        }
      })
      .subscribe()

    const presenceChannel = supabase.channel('online-presence', {
      config: { presence: { key: currentUserId } }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const onlineIds = new Set<string>()
        Object.keys(state).forEach((key) => onlineIds.add(key))
        setOnlineUsers(onlineIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() })
        }
      })

    // WebRTC & Typing signalizační kanál
    const signalChannel = supabase.channel(`chat_signal_${currentUserId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.from === activeUserId) {
          setIsTyping(payload.typing)
        }
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        if (payload.from !== activeUserId) return

        if (payload.type === 'offer') {
          setCallType(payload.callType)
          setCallStatus('incoming')
          pendingCallSignal.current = payload
        } else if (payload.type === 'answer') {
          if (peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(payload.sdp))
            setCallStatus('connected')
          }
        } else if (payload.type === 'ice-candidate') {
          if (peerConnection.current && payload.candidate) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(payload.candidate))
          }
        } else if (payload.type === 'end-call') {
          endCall()
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(signalChannel)
    }
  }, [currentUserId, activeUserId])

  // Indikátor psaní - odeslání události
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value)
    if (!activeUserId || !currentUserId) return

    const supabase = createClient()
    supabase.channel(`chat_signal_${activeUserId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { from: currentUserId, typing: true }
    })

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      supabase.channel(`chat_signal_${activeUserId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { from: currentUserId, typing: false }
      })
    }, 2000)
  }

  // WebRTC
  const createPeerConnection = (targetUserId: string, stream: MediaStream) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    })

    stream.getTracks().forEach((track) => pc.addTrack(track, stream))

    pc.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0]
      }
    }

    pc.onicecandidate = (event) => {
      if (event.candidate && currentUserId) {
        const supabase = createClient()
        supabase.channel(`chat_signal_${targetUserId}`).send({
          type: 'broadcast',
          event: 'webrtc-signal',
          payload: { from: currentUserId, type: 'ice-candidate', candidate: event.candidate }
        })
      }
    }

    peerConnection.current = pc
    return pc
  }

  const startCall = async (type: 'audio' | 'video') => {
    if (!activeUserId || !currentUserId) return
    setCallType(type)
    setCallStatus('calling')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === 'video',
        audio: true
      })
      setLocalStream(stream)
      if (localVideoRef.current && type === 'video') {
        localVideoRef.current.srcObject = stream
      }

      const pc = createPeerConnection(activeUserId, stream)
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const supabase = createClient()
      supabase.channel(`chat_signal_${activeUserId}`).send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: { from: currentUserId, type: 'offer', sdp: offer, callType: type }
      })
    } catch (err) {
      console.error(err)
      endCall()
    }
  }

  const acceptCall = async () => {
    if (!activeUserId || !currentUserId || !pendingCallSignal.current) return
    setCallStatus('connected')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      })
      setLocalStream(stream)
      if (localVideoRef.current && callType === 'video') {
        localVideoRef.current.srcObject = stream
      }

      const pc = createPeerConnection(activeUserId, stream)
      await pc.setRemoteDescription(new RTCSessionDescription(pendingCallSignal.current.sdp))

      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      const supabase = createClient()
      supabase.channel(`chat_signal_${activeUserId}`).send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: { from: currentUserId, type: 'answer', sdp: answer }
      })
    } catch (err) {
      console.error(err)
      endCall()
    }
  }

  const endCall = () => {
    if (activeUserId && currentUserId) {
      const supabase = createClient()
      supabase.channel(`chat_signal_${activeUserId}`).send({
        type: 'broadcast',
        event: 'webrtc-signal',
        payload: { from: currentUserId, type: 'end-call' }
      })
    }
    if (localStream) localStream.getTracks().forEach((t) => t.stop())
    setLocalStream(null)
    setCallStatus('idle')
    setCallType(null)
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }
  }

  // Nahrávání fotky
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId || !activeUserId) return

    setUploadingImage(true)
    const supabase = createClient()
    const filePath = `chat/${Date.now()}_${file.name}`

    const { data, error } = await supabase.storage.from('chat-media').upload(filePath, file)

    if (data) {
      const { data: urlData } = supabase.storage.from('chat-media').getPublicUrl(filePath)
      await supabase.from('messages').insert({
        sender_id: currentUserId,
        receiver_id: activeUserId,
        content: '',
        media_url: urlData.publicUrl
      })
    }
    setUploadingImage(false)
  }

  // Odeslání textové zprávy
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId || !activeUserId) return

    const supabase = createClient()
    const textToSend = newMessage.trim()
    setNewMessage('')

    await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: activeUserId,
      content: textToSend,
    })
  }

  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    return new Date(isoString).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  // Renderování obsahu zprávy (Fotky / Reels / Příspěvky / Text)
  const renderMessageContent = (msg: Message) => {
    if (msg.media_url) {
      return (
        <img src={msg.media_url} alt="Příloha" className="rounded-xl max-w-full max-h-60 object-cover shadow-sm" />
      )
    }

    const reelMatch = msg.content.match(/https?:\/\/[^\s]+\/(reel|reels)\/([a-zA-Z0-9_-]+)/)
    if (reelMatch) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs">🎬 Reel</div>
          <a href={msg.content} target="_blank" rel="noreferrer" className="block p-3 bg-black/10 rounded-xl text-xs underline truncate">
            {msg.content}
          </a>
        </div>
      )
    }

    const postMatch = msg.content.match(/https?:\/\/[^\s]+\/(p|post)\/([a-zA-Z0-9_-]+)/)
    if (postMatch) {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs">📌 Příspěvek</div>
          <a href={msg.content} target="_blank" rel="noreferrer" className="block p-3 bg-neutral-100 rounded-xl text-xs underline truncate text-neutral-800">
            {msg.content}
          </a>
        </div>
      )
    }

    return msg.content
  }

  const filteredContacts = contacts.filter((c) =>
    (c.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex w-full h-[calc(100vh-80px)] bg-white overflow-hidden max-w-[1400px] mx-auto border-x border-neutral-200/60 shadow-2xl relative">
      
      {/* SEZNAM KONTAKTŮ */}
      <div className={`w-full md:w-[350px] lg:w-[400px] flex-col border-r border-neutral-200 bg-neutral-50/50 ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-neutral-200 bg-white">
          <h1 className="text-xl font-black mb-4">Zprávy</h1>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-neutral-400">🔍</span>
            <input
              type="text"
              placeholder="Hledat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 rounded-2xl text-xs outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingContacts ? (
            <div className="text-center text-xs text-neutral-400 mt-10">Načítám...</div>
          ) : (
            filteredContacts.map((contact) => (
              <div
                key={contact.id}
                onClick={() => router.push(`/chat?userId=${contact.id}`)}
                className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${
                  contact.id === activeUserId ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-neutral-100/80 border border-transparent'
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-white border overflow-hidden flex items-center justify-center">
                  {contact.avatar_url ? <img src={contact.avatar_url} className="w-full h-full object-cover" /> : '🐾'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate">{contact.username}</h3>
                  <p className="text-xs truncate text-neutral-500">{contact.lastMessage || 'Začněte chatovat...'}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* CHAT OKNO */}
      <div className={`flex-1 flex-col bg-white ${!activeUserId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeUserId ? (
          <div className="text-neutral-400 text-center">Vyberte konverzaci.</div>
        ) : (
          <>
            <div className="h-[72px] px-4 border-b flex items-center justify-between bg-white shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/chat')} className="md:hidden font-bold">←</button>
                <div className="w-11 h-11 rounded-full bg-neutral-100 overflow-hidden flex items-center justify-center">
                  {activeProfile?.avatar_url ? <img src={activeProfile.avatar_url} className="w-full h-full object-cover" /> : '🐾'}
                </div>
                <div>
                  <h2 className="font-bold text-base">{activeProfile?.username || 'Načítám...'}</h2>
                  <div className="text-[11px]">
                    {isTyping ? (
                      <span className="text-indigo-600 font-semibold animate-pulse">píše...</span>
                    ) : onlineUsers.has(activeProfile?.id || '') ? (
                      <span className="text-green-500">Aktivní nyní</span>
                    ) : (
                      <span className="text-neutral-400">Offline</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <button onClick={() => startCall('audio')} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">📞</button>
                <button onClick={() => startCall('video')} className="w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center">📹</button>
              </div>
            </div>

            {/* ZPRÁVY */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa]">
              {messages.map((msg, index) => {
                const isMine = msg.sender_id === currentUserId
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                        isMine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border text-neutral-800 rounded-bl-sm'
                      }`}
                    >
                      {renderMessageContent(msg)}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT FORM */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t flex items-center gap-3">
              <label className="cursor-pointer text-xl p-2 hover:bg-neutral-100 rounded-full">
                📷
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploadingImage} />
              </label>

              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Napište zprávu..."
                className="flex-1 px-5 py-3 bg-neutral-100 rounded-full text-sm outline-none"
              />

              <button type="submit" disabled={!newMessage.trim()} className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                ➔
              </button>
            </form>
          </>
        )}
      </div>

      {/* OVERLAY PRO HOVORY */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-between p-8 text-white">
          <div className="text-center mt-6">
            <h3 className="text-2xl font-bold">{activeProfile?.username || 'Uživatel'}</h3>
            <p className="text-sm text-neutral-400">{callStatus}</p>
          </div>

          {callType === 'video' && (
            <div className="relative w-full max-w-2xl aspect-video bg-neutral-900 rounded-3xl overflow-hidden">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-24 bg-black rounded-xl border object-cover" />
            </div>
          )}

          <div className="flex items-center gap-6 mb-8">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 text-2xl">📞</button>
                <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 text-2xl">❌</button>
              </>
            ) : (
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 text-2xl">🛑</button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-neutral-400">Načítám chat...</div>}>
      <ChatContent />
    </Suspense>
  )
}