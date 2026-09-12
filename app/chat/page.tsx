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

const ArrowLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
)

const ImageIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
)

const StickerIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.5L15.5 3z"/><path d="M14 3v6h6"/></svg>
)

// --- KATEGORIE SAMOLEPEK ---
const STICKER_CATEGORIES = [
  {
    name: '3D Emoji',
    stickers: [
      { id: '3d_1', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Grinning%20Face%20with%20Big%20Eyes.png' },
      { id: '3d_2', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Smiling%20Face%20with%20Heart-Eyes.png' },
      { id: '3d_3', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Partying%20Face.png' },
      { id: '3d_4', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Victory%20Hand.png' },
      { id: '3d_5', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Fire.png' },
      { id: '3d_6', url: 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Exploding%20Head.png' },
    ]
  },
  {
    name: 'Animované (GIF)',
    stickers: [
      { id: 'gif_1', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h5Z3E5ZzR3NXd5M3d5M3d5M3d5M3d5M3d5M3d5/3o7TKsjRrfIPjei8wM/giphy.gif' },
      { id: 'gif_2', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h5Z3E5ZzR3NXd5M3d5M3d5M3d5M3d5M3d5M3d5/l41fk5N7uT2m8oWly/giphy.gif' },
      { id: 'gif_3', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h5Z3E5ZzR3NXd5M3d5M3d5M3d5M3d5M3d5M3d5/26u4b45b8KxyP56I8/giphy.gif' },
      { id: 'gif_4', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3h5Z3E5ZzR3NXd5M3d5M3d5M3d5M3d5M3d5M3d5/xT9IgG50Fb7Mi0prBC/giphy.gif' },
    ]
  },
  {
    name: 'Klasické',
    stickers: [
      { id: 'cl_1', url: 'https://cdn-icons-png.flaticon.com/512/742/742751.png' },
      { id: 'cl_2', url: 'https://cdn-icons-png.flaticon.com/512/742/742752.png' },
      { id: 'cl_3', url: 'https://cdn-icons-png.flaticon.com/512/742/742760.png' },
      { id: 'cl_4', url: 'https://cdn-icons-png.flaticon.com/512/742/742784.png' },
    ]
  }
]

export type Profile = {
  id: string
  username?: string
  first_name?: string
  avatar_url?: string
  last_seen?: string
}

export type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  media_url?: string
  sticker_url?: string
  created_at: string
}

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
  const [contacts, setContacts] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map())
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Nabídky
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [activeStickerTab, setActiveStickerTab] = useState(0)

  // Kontextové menu
  const [selectedMsgMenu, setSelectedMsgMenu] = useState<{ msg: Message; x: number; y: number } | null>(null)
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // WebRTC
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

  // Načtení všech profilů z tabulky profiles + seřazení podle historie správ
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // 1. Načtení VŠECH profilů z tabulky profiles
      const { data: allProfiles, error: profError } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', user.id)

      if (profError) {
        console.error('Chyba při načítání profilů:', profError)
        return
      }

      if (!allProfiles) return

      // 2. Načtení historie zpráv pro seřazení aktivních konverzací nahoru
      const { data: userMessages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      // Extrakce ID partnerů, se kterými už proběhla zpráva
      const activePartnerIds = Array.from(
        new Set(
          (userMessages || []).map((msg) =>
            msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
          )
        )
      )

      // Seřazení: nejprve ti, se kterými proběhla konverzace, potom zbytek
      const activeProfiles = activePartnerIds
        .map((id) => allProfiles.find((p) => p.id === id))
        .filter((p): p is Profile => p !== undefined)

      const remainingProfiles = allProfiles.filter(
        (p) => !activePartnerIds.includes(p.id)
      )

      const sortedContacts = [...activeProfiles, ...remainingProfiles]

      setContacts(sortedContacts)

      if (!activeUserId && sortedContacts.length > 0 && window.innerWidth >= 768) {
        router.replace(`/chat?userId=${sortedContacts[0].id}`)
      }
    }

    init()
  }, [router, activeUserId])

  // Načtení konverzace a aktivního profilu
  useEffect(() => {
    if (!activeUserId || !currentUserId) {
      setActiveProfile(null)
      return
    }

    const fetchProfileAndMessages = async () => {
      const supabase = createClient()
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', activeUserId)
        .single()

      if (profile) setActiveProfile(profile)

      const { data: oldMessages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (!error && oldMessages) {
        setMessages(oldMessages)
        setTimeout(scrollToBottom, 100)
      }
    }

    fetchProfileAndMessages()
    setIsTyping(false)
  }, [activeUserId, currentUserId])

  // Realtime poslech
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

  const sendPayload = async (payload: Partial<Message>) => {
    if (!currentUserId || !activeUserId) return
    const supabase = createClient()

    const fullPayload = {
      sender_id: currentUserId,
      receiver_id: activeUserId,
      content: payload.content || '',
      media_url: payload.media_url || null,
      sticker_url: payload.sticker_url || null,
      created_at: new Date().toISOString()
    }

    const { data: savedMsg, error } = await supabase
      .from('messages')
      .insert(fullPayload)
      .select()
      .single()

    if (error) console.error('Chyba při ukládání:', error)

    const msgToSend = savedMsg || { ...fullPayload, id: crypto.randomUUID() }

    await supabase.channel(`chat_signal_${activeUserId}`).send({
      type: 'broadcast',
      event: 'direct-message',
      payload: msgToSend
    })

    setMessages((prev) => [...prev, msgToSend])
    scrollToBottom()
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    if (activeUserId && currentUserId) {
      const supabase = createClient()
      supabase.channel(`chat_signal_${activeUserId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { from: currentUserId, typing: false }
      })
    }

    sendPayload({ content: newMessage.trim() })
    setNewMessage('')
    setShowAttachMenu(false)
    setShowStickerPicker(false)
  }

  const handleSendSticker = (stickerUrl: string) => {
    sendPayload({ sticker_url: stickerUrl })
    setShowAttachMenu(false)
    setShowStickerPicker(false)
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      alert('Obrázek je příliš velký (max 5 MB).')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      sendPayload({ media_url: reader.result as string })
      setShowAttachMenu(false)
    }

    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault()
    setSelectedMsgMenu({ msg, x: e.clientX, y: e.clientY })
  }

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    const touch = e.touches[0]
    touchTimerRef.current = setTimeout(() => {
      setSelectedMsgMenu({ msg, x: touch.clientX, y: touch.clientY })
    }, 500)
  }

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
  }

  const copyMessage = () => {
    if (selectedMsgMenu?.msg.content) {
      navigator.clipboard.writeText(selectedMsgMenu.msg.content)
    }
    setSelectedMsgMenu(null)
  }

  const deleteMessageLocally = async () => {
    if (selectedMsgMenu) {
      const msgId = selectedMsgMenu.msg.id
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
      
      const supabase = createClient()
      await supabase.from('messages').delete().eq('id', msgId)
    }
    setSelectedMsgMenu(null)
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
    if (msg.sticker_url) {
      return <img src={msg.sticker_url} alt="Samolepka" className="w-28 h-28 object-contain my-1" />
    }

    if (msg.media_url) {
      return <img src={msg.media_url} alt="Obrázek" className="rounded-2xl max-w-full max-h-72 object-cover shadow-sm" />
    }

    return msg.content
  }

  const filteredContacts = contacts.filter((c) => {
    const name = c.username || c.first_name || 'Uživatel'
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  return (
    <div className="flex w-full h-[calc(100vh-80px)] bg-slate-50 overflow-hidden max-w-[1400px] mx-auto border-x border-slate-200/80 shadow-2xl relative font-sans" onClick={() => setSelectedMsgMenu(null)}>
      
      {/* LEVÝ PANEL - KONTAKTNÍ SEZNAM */}
      <div className={`w-full md:w-[360px] lg:w-[400px] flex-col border-r border-slate-200 bg-white ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 border-b border-slate-100">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-4">Konverzace</h1>
          <div className="relative">
            <span className="absolute left-3.5 top-3 text-slate-400">
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Hledat v konverzacích..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500/30 rounded-2xl text-xs outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">Nenalezeni žádní uživatelé.</div>
          ) : (
            filteredContacts.map((contact) => {
              const isOnline = onlineUsers.has(contact.id)
              const displayName = contact.username || contact.first_name || 'Uživatel'
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
                      {contact.avatar_url ? (
                        <img src={contact.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                      ) : (
                        displayName.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    {isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="font-bold text-sm truncate">{displayName}</h3>
                    </div>
                    <p className={`text-xs truncate ${contact.id === activeUserId ? 'text-indigo-100' : 'text-slate-400'}`}>
                      {isOnline ? 'Aktivní nyní' : formatLastSeen(contact.last_seen)}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* PRAVÝ PANEL - DETAIL CHATU */}
      <div className={`flex-1 flex-col bg-white ${!activeUserId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeUserId ? (
          <div className="text-center p-8">
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-4 text-3xl font-black">
              💬
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Vyberte uživatele</h3>
            <p className="text-xs text-slate-400 max-w-sm">Klikněte na jakýkoliv profil ze seznamu vlevo a zahajte konverzaci.</p>
          </div>
        ) : (
          <>
            {/* HLAVIČKA CHATU */}
            <div className="h-20 px-4 md:px-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => router.push('/chat')} 
                  className="md:hidden p-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold active:scale-95 transition-all"
                >
                  <ArrowLeftIcon />
                </button>

                <div className="relative">
                  <div className="w-11 h-11 md:w-12 md:h-12 rounded-2xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center overflow-hidden">
                    {activeProfile?.avatar_url ? (
                      <img src={activeProfile.avatar_url} alt={activeProfile.username || 'Avatar'} className="w-full h-full object-cover" />
                    ) : (
                      (activeProfile?.username || activeProfile?.first_name || 'U').substring(0, 2).toUpperCase()
                    )}
                  </div>
                  {onlineUsers.has(activeProfile?.id || '') && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-slate-900 text-sm md:text-base">{activeProfile?.username || activeProfile?.first_name || 'Načítám...'}</h2>
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

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startCall('audio')} 
                  className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-all"
                  title="Hlasový hovor"
                >
                  <PhoneIcon />
                </button>
                <button 
                  onClick={() => startCall('video')} 
                  className="w-10 h-10 md:w-11 md:h-11 rounded-2xl bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 flex items-center justify-center transition-all"
                  title="Video hovor"
                >
                  <VideoIcon />
                </button>
              </div>
            </div>

            {/* HISTORIE ZPRÁV */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">Žádné dosavadní zprávy. Napište první zprávu!</div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId
                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div 
                        onContextMenu={(e) => handleContextMenu(e, msg)}
                        onTouchStart={(e) => handleTouchStart(e, msg)}
                        onTouchEnd={handleTouchEnd}
                        className={`max-w-[80%] md:max-w-[70%] px-4 py-3 rounded-2xl text-sm shadow-sm transition-all select-none cursor-pointer ${
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

            {/* DOLNÍ VSTUPNÍ POLE */}
            <div className="bg-white border-t border-slate-100 sticky bottom-0 left-0 right-0 z-20 shadow-md">
              
              {isTyping && (
                <div className="px-4 pt-2 flex items-center gap-2 text-slate-500">
                  <div className="bg-slate-100 border border-slate-200/60 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  </div>
                  <span className="italic text-[11px] text-slate-400 font-medium">píše...</span>
                </div>
              )}

              {/* NABÍDKA SAMOLEPEK */}
              {showStickerPicker && (
                <div className="p-3 border-b border-slate-100 bg-slate-50/90 backdrop-blur-md">
                  <div className="flex gap-2 mb-3 border-b border-slate-200/60 pb-2">
                    {STICKER_CATEGORIES.map((cat, idx) => (
                      <button
                        key={cat.name}
                        onClick={() => setActiveStickerTab(idx)}
                        className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                          activeStickerTab === idx ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-200/60'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-4 md:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
                    {STICKER_CATEGORIES[activeStickerTab].stickers.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => handleSendSticker(s.url)}
                        className="w-full aspect-square p-2 rounded-2xl bg-white border border-slate-200/80 hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center shrink-0 shadow-xs active:scale-95"
                      >
                        <img src={s.url} alt="Sticker" className="w-full h-full object-contain" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* TLAČÍTKO PŘÍLOH */}
              {showAttachMenu && (
                <div className="p-3 border-b border-slate-100 bg-white flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-xs font-bold text-slate-700 cursor-pointer transition-all">
                    <ImageIcon />
                    <span>Obrázek</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>

                  <button
                    onClick={() => setShowStickerPicker(!showStickerPicker)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-2xl text-xs font-bold transition-all"
                  >
                    <StickerIcon />
                    <span>Samolepky & GIF</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="p-3 md:p-4 flex items-center gap-2 md:gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAttachMenu(!showAttachMenu)
                    setShowStickerPicker(false)
                  }}
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 ${
                    showAttachMenu ? 'bg-indigo-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  <PlusIcon />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  placeholder="Napište zprávu..."
                  className="flex-1 px-4 md:px-5 py-3 bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500/30 rounded-2xl text-sm outline-none transition-all text-slate-900"
                />

                <button 
                  type="submit" 
                  disabled={!newMessage.trim()} 
                  className="w-11 h-11 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-indigo-600/20 transition-all shrink-0"
                >
                  <SendIcon />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {/* KONTEXTOVÉ MENU NA ZPRÁVĚ */}
      {selectedMsgMenu && (
        <div 
          className="fixed z-[300] bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 min-w-[160px] animate-in fade-in zoom-in-95 duration-100"
          style={{ top: Math.min(selectedMsgMenu.y, window.innerHeight - 120), left: Math.min(selectedMsgMenu.x, window.innerWidth - 180) }}
        >
          {selectedMsgMenu.msg.content && (
            <button 
              onClick={copyMessage}
              className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-all flex items-center gap-2"
            >
              📋 Zkopírovat
            </button>
          )}
          <button 
            onClick={deleteMessageLocally}
            className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all flex items-center gap-2"
          >
            🗑️ Odstranit
          </button>
        </div>
      )}

      {/* OVERLAY PRO VOICE/VIDEO CALL */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-[200] flex flex-col items-center justify-between p-8 text-white">
          <div className="text-center mt-8">
            <div className="w-24 h-24 rounded-3xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-3xl font-bold mx-auto mb-4 animate-pulse overflow-hidden">
              {activeProfile?.avatar_url ? (
                <img src={activeProfile.avatar_url} alt={activeProfile.username || 'Avatar'} className="w-full h-full object-cover" />
              ) : (
                (activeProfile?.username || activeProfile?.first_name || 'U').substring(0, 2).toUpperCase()
              )}
            </div>
            <h3 className="text-2xl font-black mb-1">{activeProfile?.username || activeProfile?.first_name}</h3>
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