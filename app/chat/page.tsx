'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  username: string
  avatar_url?: string
}

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  created_at: string
}

type Contact = Profile & {
  lastMessage?: string
  lastMessageTime?: string
}

function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeUserId = searchParams.get('userId')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  // WebRTC / Hovory
  const [callType, setCallType] = useState<'audio' | 'video' | null>(null)
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'incoming' | 'connected'>('idle')
  const [localStream, setLocalStream] = useState<MediaStream | null>(null)
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const peerConnection = useRef<RTCPeerConnection | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 1. OKAMŽITÉ NAČTENÍ AKTIVNÍHO PROFILU PODLE ID Z URL
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

  // 2. INICIALIZATE UŽIVATELE A KONTAKTŮ
  useEffect(() => {
    const initData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
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

    initData()
  }, [activeUserId, router])

  // 3. NAČTENÍ ZPRÁV AKTIVNÍHO CHATU
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

  // 4. SUPABASE REALTIME (ZPRÁVY + ONLINE PRESENCE + WEBRTC SIGNALIZACE)
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    // Realtime Zprávy
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

    // Online Presence
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

    // WebRTC Signalizace pro hovory
    const callChannel = supabase.channel(`user_call_${currentUserId}`)
      .on('broadcast', { event: 'call-offer' }, async ({ payload }) => {
        setCallType(payload.type)
        setCallStatus('incoming')
      })
      .on('broadcast', { event: 'call-end' }, () => {
        endCall()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
      supabase.removeChannel(presenceChannel)
      supabase.removeChannel(callChannel)
    }
  }, [currentUserId, activeUserId])

  // 5. INICIALIZACE WEBRTC A ZAHÁJENÍ HOVORU
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

      const supabase = createClient()
      supabase.channel(`user_call_${activeUserId}`).send({
        type: 'broadcast',
        event: 'call-offer',
        payload: { from: currentUserId, type }
      })
    } catch (err) {
      console.error('Kamera/mikrofon nedostupný:', err)
      alert('Nepodařilo se přistoupit k mikrofonu nebo kameře.')
      endCall()
    }
  }

  const acceptCall = async () => {
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
    } catch (err) {
      console.error(err)
      endCall()
    }
  }

  const endCall = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop())
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop())
    }
    setLocalStream(null)
    setRemoteStream(null)
    setCallStatus('idle')
    setCallType(null)
    if (peerConnection.current) {
      peerConnection.current.close()
      peerConnection.current = null
    }
  }

  // Odeslání zprávy
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
    const date = new Date(isoString)
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
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
              placeholder="Hledat konverzaci..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingContacts ? (
            <div className="text-center text-xs text-neutral-400 mt-10">Načítám zprávy...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center text-xs text-neutral-400 mt-10">Žádné konverzace.</div>
          ) : (
            filteredContacts.map((contact) => {
              const isActiveChat = contact.id === activeUserId
              const isOnline = onlineUsers.has(contact.id)

              return (
                <div
                  key={contact.id}
                  onClick={() => router.push(`/chat?userId=${contact.id}`)}
                  className={`flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all mb-1 ${
                    isActiveChat ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-neutral-100/80 border border-transparent'
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-white border border-neutral-200 overflow-hidden flex items-center justify-center">
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl">🐾</span>
                      )}
                    </div>
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline mb-0.5">
                      <h3 className="font-bold text-sm truncate">{contact.username}</h3>
                      <span className="text-[10px] text-neutral-400">{formatTime(contact.lastMessageTime)}</span>
                    </div>
                    <p className={`text-xs truncate ${isActiveChat ? 'text-indigo-600 font-medium' : 'text-neutral-500'}`}>
                      {contact.lastMessage || 'Začněte chatovat...'}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* AKTIVNÍ CHAT */}
      <div className={`flex-1 flex-col bg-white ${!activeUserId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeUserId ? (
          <div className="text-center text-neutral-400 flex flex-col items-center">
            <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center text-4xl mb-4 border border-neutral-100">💬</div>
            <h2 className="text-lg font-bold text-neutral-700">Vaše zprávy</h2>
            <p className="text-sm mt-1">Vyberte konverzaci ze seznamu.</p>
          </div>
        ) : (
          <>
            {/* HLAVIČKA CHATU S TLAČÍTKY HLASOVÉHO A VIDEO HOVORU */}
            <div className="h-[72px] px-4 border-b border-neutral-200/80 flex items-center justify-between bg-white/95 backdrop-blur-sm z-10 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => router.push('/chat')} className="md:hidden w-10 h-10 rounded-full bg-neutral-100 flex items-center justify-center font-bold">
                  ←
                </button>
                
                <div className="relative">
                  <div className="w-11 h-11 rounded-full bg-neutral-100 border border-neutral-200 overflow-hidden flex items-center justify-center cursor-pointer" onClick={() => router.push(`/profile/${activeProfile?.id}`)}>
                    {activeProfile?.avatar_url ? (
                      <img src={activeProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-lg">🐾</span>
                    )}
                  </div>
                  {onlineUsers.has(activeProfile?.id || '') && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
                  )}
                </div>

                <div className="cursor-pointer" onClick={() => router.push(`/profile/${activeProfile?.id}`)}>
                  <h2 className="font-bold text-base leading-tight">
                    {activeProfile?.username || 'Načítám jméno...'}
                  </h2>
                  <div className="text-[11px] font-medium flex items-center gap-1.5 mt-0.5">
                    {onlineUsers.has(activeProfile?.id || '') ? (
                      <span className="text-green-500">Aktivní nyní</span>
                    ) : (
                      <span className="text-neutral-400">Offline</span>
                    )}
                  </div>
                </div>
              </div>

              {/* TLAČÍTKA PRO HOVORY */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => startCall('audio')}
                  className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-base transition-all"
                  title="Hlasový hovor"
                >
                  📞
                </button>
                <button
                  onClick={() => startCall('video')}
                  className="w-10 h-10 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-base transition-all"
                  title="Video hovor"
                >
                  📹
                </button>
              </div>
            </div>

            {/* VÝPIS ZPRÁV */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#f8f9fa] relative">
              {loadingMessages ? (
                <div className="absolute inset-0 flex items-center justify-center bg-[#f8f9fa]/80 backdrop-blur-sm z-10">
                  <span className="text-neutral-500 text-sm font-medium">Načítám...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-neutral-400 space-y-3">
                  <div className="text-5xl">👋</div>
                  <p className="text-sm font-medium">Napište první zprávu!</p>
                </div>
              ) : (
                messages.map((msg, index) => {
                  const isMine = msg.sender_id === currentUserId
                  const showTime = index === 0 || new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 5 * 60000

                  return (
                    <div key={msg.id} className="flex flex-col">
                      {showTime && (
                        <div className="text-center text-[10px] font-semibold text-neutral-400 my-3">
                          {formatTime(msg.created_at)}
                        </div>
                      )}
                      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isMine
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-sm'
                              : 'bg-white border border-neutral-200/80 text-neutral-800 rounded-bl-sm'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* VKLÁDÁNÍ ZPRÁVY */}
            <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-neutral-200 flex items-center gap-3">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Napište zprávu..."
                className="flex-1 px-5 py-3 bg-neutral-100 rounded-full text-sm outline-none border border-transparent focus:border-indigo-400 focus:bg-white transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white disabled:opacity-50 hover:bg-indigo-700 transition-all shadow-md"
              >
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          </>
        )}
      </div>

      {/* OVERLAY PRO AUDIO / VIDEO HOVORY */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-between p-8 text-white">
          <div className="text-center mt-6">
            <h3 className="text-2xl font-bold mb-2">{activeProfile?.username || 'Uživatel'}</h3>
            <p className="text-sm text-neutral-400">
              {callStatus === 'calling' && 'Volám...'}
              {callStatus === 'incoming' && 'Příchozí hovor...'}
              {callStatus === 'connected' && 'Probíhá hovor'}
            </p>
          </div>

          {/* VIDEO PROSTORY */}
          {callType === 'video' && (
            <div className="relative w-full max-w-2xl aspect-video bg-neutral-900 rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-24 bg-black rounded-xl border border-white/20 object-cover" />
            </div>
          )}

          {/* OVLÁDÁNÍ HOVORU */}
          <div className="flex items-center gap-6 mb-8">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={acceptCall} className="w-16 h-16 rounded-full bg-green-500 text-2xl flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform">
                  📞
                </button>
                <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 text-2xl flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform">
                  ❌
                </button>
              </>
            ) : (
              <button onClick={endCall} className="w-16 h-16 rounded-full bg-red-600 text-2xl flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform">
                🛑
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
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-neutral-400 text-sm">Načítám chat...</div>}>
      <ChatContent />
    </Suspense>
  )
}