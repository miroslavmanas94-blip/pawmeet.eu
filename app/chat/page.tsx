'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// --- VLASTNÍ SVG IKONY ---
const PhoneIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
)

const VideoIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
)

const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
)

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
)

const PhoneOffIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
)

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
)

export type Profile = {
  id: string
  username: string
  avatar_url?: string
  last_seen?: string
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
}

// Pomocná funkce pro lidské zobrazení času "Naposledy online"
function formatLastSeen(dateString?: string) {
  if (!dateString) return 'Offline'
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Před chvílí'
  if (diffInSeconds < 3600) return `Před ${Math.floor(diffInSeconds / 60)} min`
  if (diffInSeconds < 86400) return `Před ${Math.floor(diffInSeconds / 3600)} hod`
  return `Před ${Math.floor(diffInSeconds / 86400)} dny`
}

function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeUserId = searchParams.get('userId')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  
  // Sledování stavu online uživatelů a jejich posledního zastižení
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map())

  // Indikátor psaní
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // WebRTC / Volání
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)
  const pendingCallSignal = useRef<any>(null)
  const ringtoneAudio = useRef<HTMLAudioElement | null>(null)

  const playRingtone = () => {
    if (!ringtoneAudio.current) {
      ringtoneAudio.current = new Audio('https://assets.mixkit.co/active_storage/sfx/1361/1361-preview.mp3')
      ringtoneAudio.current.loop = true
    }
    ringtoneAudio.current.play().catch(() => {})
  }

  const stopRingtone = () => {
    if (ringtoneAudio.current) {
      ringtoneAudio.current.pause()
      ringtoneAudio.current.currentTime = 0
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, last_seen')
        .neq('id', user.id)

      if (profiles) {
        setContacts(profiles)
      }
    }
    init()
  }, [router])

  useEffect(() => {
    if (!activeUserId) {
      setActiveProfile(null)
      return
    }
    const fetchActiveProfile = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, last_seen')
        .eq('id', activeUserId)
        .single()

      if (data) setActiveProfile(data)
    }
    fetchActiveProfile()
    setMessages([])
    setIsTyping(false)
  }, [activeUserId])

  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const presenceChannel = supabase.channel('online-presence', {
      config: { presence: { key: currentUserId } }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const userMap = new Map<string, string>()
        Object.keys(state).forEach((key) => {
          const userPresence = state[key][0] as any
          userMap.set(key, userPresence?.online_at || new Date().toISOString())
        })
        setOnlineUsers(userMap)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() })
        }
      })

    const signalChannel = supabase.channel(`chat_signal_${currentUserId}`)
      .on('broadcast', { event: 'direct-message' }, ({ payload }) => {
        if (payload.sender_id === activeUserId) {
          setMessages((prev) => [...prev, payload])
          setIsTyping(false)
          scrollToBottom()
        }
      })
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.from === activeUserId) {
          setIsTyping(payload.typing)
          scrollToBottom()
        }
      })
      .on('broadcast', { event: 'webrtc-signal' }, async ({ payload }) => {
        if (payload.from !== activeUserId) return

        if (payload.type === 'offer') {
          setCallType(payload.callType)
          setCallStatus('incoming')
          playRingtone()
          pendingCallSignal.current = payload
        } else if (payload.type === 'answer') {
          stopRingtone()
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
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(signalChannel)
    }
  }, [currentUserId, activeUserId])

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId || !activeUserId) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    const supabase = createClient()
    supabase.channel(`chat_signal_${activeUserId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { from: currentUserId, typing: false }
    })

    const textToSend = newMessage.trim()
    setNewMessage('')

    const msgPayload: Message = {
      id: crypto.randomUUID(),
      sender_id: currentUserId,
      receiver_id: activeUserId,
      content: textToSend,
      created_at: new Date().toISOString()
    }

    await supabase.channel(`chat_signal_${activeUserId}`).send({
      type: 'broadcast',
      event: 'direct-message',
      payload: msgPayload
    })

    setMessages((prev) => [...prev, msgPayload])
    scrollToBottom()
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentUserId || !activeUserId) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Obrázek je příliš velký (max 5 MB).')
      return
    }

    const reader = new FileReader()
    reader.onload = async () => {
      const base64Image = reader.result as string

      const msgPayload: Message = {
        id: crypto.randomUUID(),
        sender_id: currentUserId,
        receiver_id: activeUserId,
        content: '',
        media_url: base64Image,
        created_at: new Date().toISOString()
      }

      const supabase = createClient()
      await supabase.channel(`chat_signal_${activeUserId}`).send({
        type: 'broadcast',
        event: 'direct-message',
        payload: msgPayload
      })

      setMessages((prev) => [...prev, msgPayload])
      scrollToBottom()
    }

    reader.readAsDataURL(file)
    e.target.value = ''
  }

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
    playRingtone()

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
    stopRingtone()
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
    stopRingtone()
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

  const renderMessageContent = (msg: Message) => {
    if (msg.media_url) {
      return (
        <img src={msg.media_url} alt="Obrázek" className="rounded-2xl max-w-full max-h-72 object-cover shadow-sm" />
      )
    }

    const reelMatch = msg.content.match(/https?:\/\/[^\s]+\/(reel|reels)\/([a-zA-Z0-9_-]+)/)
    if (reelMatch) {
      return (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold opacity-70 flex items-center gap-1">🎬 Instagram Reel</div>
          <a href={msg.content} target="_blank" rel="noreferrer" className="block p-3 bg-black/10 rounded-xl text-xs underline truncate backdrop-blur-sm">
            {msg.content}
          </a>
        </div>
      )
    }

    const postMatch = msg.content.match(/https?:\/\/[^\s]+\/(p|post)\/([a-zA-Z0-9_-]+)/)
    if (postMatch) {
      return (
        <div className="space-y-1">
          <div className="text-[11px] font-semibold opacity-70 flex items-center gap-1">📌 Příspěvek</div>
          <a href={msg.content} target="_blank" rel="noreferrer" className="block p-3 bg-black/10 rounded-xl text-xs underline truncate backdrop-blur-sm">
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
    <div className="flex w-full h-[calc(100vh-80px)] bg-slate-50 overflow-hidden max-w-[1400px] mx-auto border-x border-slate-200/80 shadow-2xl relative font-sans">
      
      {/* LEVÝ PANEL - KONTAKTY */}
      <div className={`w-full md:w-[360px] lg:w-[400px] flex-col border-r border-slate-200 bg-white ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Konverzace</h1>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Hledat uživatele..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500/30 rounded-2xl text-xs outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredContacts.map((contact) => {
            const isOnline = onlineUsers.has(contact.id)
            return (
              <div
                key={contact.id}
                onClick={() => router.push(`/chat?userId=${contact.id}`)}
                className={`flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer transition-all ${
                  contact.id === activeUserId 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'hover:bg-slate-100/80 text-slate-700'
                }`}
              >
                <div className="relative">
                  <div className={`w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center font-bold text-lg ${contact.id === activeUserId ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                    {contact.avatar_url ? <img src={contact.avatar_url} className="w-full h-full object-cover" /> : contact.username.substring(0, 2).toUpperCase()}
                  </div>
                  {isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h3 className="font-bold text-sm truncate">{contact.username}</h3>
                  </div>
                  <p className={`text-xs truncate ${contact.id === activeUserId ? 'text-indigo-100' : 'text-slate-400'}`}>
                    {isOnline ? 'Aktivní nyní' : formatLastSeen(contact.last_seen)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PRAVÝ PANEL - CHAT */}
      <div className={`flex-1 flex-col bg-white ${!activeUserId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeUserId ? (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl font-black">
              💬
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Zabezpečený živý chat</h3>
            <p className="text-xs text-slate-400 max-w-sm">Zprávy existují pouze v reálném čase. Vyberte kontakt a začněte konverzaci.</p>
          </div>
        ) : (
          <>
            {/* HLAVIČKA CHATU */}
            <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button onClick={() => router.push('/chat')} className="md:hidden p-2 text-slate-600 font-bold">←</button>
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center overflow-hidden">
                    {activeProfile?.avatar_url ? <img src={activeProfile.avatar_url} className="w-full h-full object-cover" /> : activeProfile?.username.substring(0, 2).toUpperCase()}
                  </div>
                  {onlineUsers.has(activeProfile?.id || '') && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-slate-900 text-base">{activeProfile?.username || 'Načítám...'}</h2>
                  <div className="text-xs">
                    {isTyping ? (
                      <span className="text-indigo-600 font-semibold animate-pulse">píše zprávu...</span>
                    ) : onlineUsers.has(activeProfile?.id || '') ? (
                      <span className="text-emerald-600 font-medium">Aktivní nyní</span>
                    ) : (
                      <span className="text-slate-400">{formatLastSeen(activeProfile?.last_seen)}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TLAČÍTKA VOLÁNÍ */}
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startCall('audio')} 
                  className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-all"
                  title="Hlasový hovor"
                >
                  <PhoneIcon />
                </button>
                <button 
                  onClick={() => startCall('video')} 
                  className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-all"
                  title="Video hovor"
                >
                  <VideoIcon />
                </button>
              </div>
            </div>

            {/* SEZNAM ZPRÁV */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">Žádné zprávy v tomto sezení. Napište první zprávu.</div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm transition-all ${
                          isMine 
                            ? 'bg-indigo-600 text-white rounded-br-xs' 
                            : 'bg-white border border-slate-200/60 text-slate-800 rounded-bl-xs'
                        }`}
                      >
                        {renderMessageContent(msg)}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* SEKCIE PRO PSANÍ A INDIKÁTOR PSANÍ HLAVNÍ LIŠTĚ */}
            <div className="bg-white border-t border-slate-100 sticky bottom-0 left-0 right-0 z-10">
              
              {/* Indikátor se 3 tečkami přesně NAD hlavní lištou na levé straně */}
              {isTyping && (
                <div className="px-4 pt-2.5 flex items-center gap-2 text-slate-500">
                  <div className="bg-slate-100 border border-slate-200/60 px-3 py-1.5 rounded-full flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="italic text-[11px] text-slate-400 font-medium">píše...</span>
                </div>
              )}

              {/* HLAVNÍ LIŠTA PRO PSANÍ ZPRÁVY */}
              <form onSubmit={handleSendMessage} className="p-4 flex items-center gap-3">
                <label className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer transition-all">
                  <PlusIcon />
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>

                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Napište zprávu..."
                  className="flex-1 px-5 py-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500/30 rounded-2xl text-sm outline-none transition-all text-slate-900"
                />

                <button 
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <SendIcon />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* OVERLAY PRO HOVORY */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-between p-8 text-white">
          <div className="text-center mt-8">
            <div className="w-24 h-24 rounded-3xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-3xl font-bold mx-auto mb-4 animate-pulse">
              {activeProfile?.avatar_url ? <img src={activeProfile.avatar_url} className="w-full h-full object-cover rounded-3xl" /> : activeProfile?.username.substring(0, 2).toUpperCase()}
            </div>
            <h3 className="text-2xl font-black mb-1">{activeProfile?.username}</h3>
            <p className="text-xs tracking-wider uppercase font-semibold text-slate-400">
              {callStatus === 'calling' && 'Volám...'}
              {callStatus === 'incoming' && 'Příchozí hovor...'}
              {callStatus === 'connected' && 'Probíhá hovor'}
            </p>
          </div>

          {callType === 'video' && (
            <div className="relative w-full max-w-2xl aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl my-4">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-36 h-24 bg-slate-950 rounded-2xl border border-white/20 object-cover shadow-lg" />
            </div>
          )}

          <div className="flex items-center gap-6 mb-8">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={acceptCall} className="w-16 h-16 rounded-3xl bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 transition-all hover:scale-105">
                  <PhoneIcon />
                </button>
                <button onClick={endCall} className="w-16 h-16 rounded-3xl bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all hover:scale-105">
                  <PhoneOffIcon />
                </button>
              </>
            ) : (
              <button 
                onClick={endCall} 
                className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl shadow-xl shadow-rose-600/30 flex items-center gap-3 transition-all hover:scale-105"
              >
                <PhoneOffIcon />
                <span>Zavěsit</span>
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-slate-400 text-sm">Načítám rozhraní...</div>}>
      <ChatContent />
    </Suspense>
  )
}