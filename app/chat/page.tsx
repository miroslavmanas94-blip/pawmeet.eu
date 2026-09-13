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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
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

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
)

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
)

const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
)

const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
)

export type Profile = {
  id: string
  username?: string
  first_name?: string
  full_name?: string
  avatar_url?: string
  last_seen?: string
}

export type PublicGroup = {
  id: string
  name: string
  description?: string
  members_count?: number
  is_private?: boolean
}

export type Message = {
  id: string
  sender_id: string
  receiver_id?: string
  group_id?: string
  content: string
  media_url?: string
  created_at: string
}

function formatLastSeen(dateString?: string) {
  if (!dateString) return 'Offline'
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Aktivní před chvílí'
  if (diffInSeconds < 3600) return `Naposledy online před ${Math.floor(diffInSeconds / 60)} min`
  if (diffInSeconds < 86400) return `Naposledy online před ${Math.floor(diffInSeconds / 3600)} hod`
  return `Naposledy online před ${Math.floor(diffInSeconds / 86400)} dny`
}

function formatTimeOnly(dateString: string) {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeUserId = searchParams.get('userId')
  const activeGroupId = searchParams.get('groupId')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [contacts, setContacts] = useState<Profile[]>([])
  const [myGroups, setMyGroups] = useState<PublicGroup[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [activeGroup, setActiveGroup] = useState<PublicGroup | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  
  const [onlineUsers, setOnlineUsers] = useState<Map<string, string>>(new Map())
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [selectedMsgMenu, setSelectedMsgMenu] = useState<{ msg: Message; x: number; y: number } | null>(null)

  // MODÁLNÍ OKNO PRO TLAČÍTKO PLUS
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState<'search' | 'group'>('search')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [publicGroups, setPublicGroups] = useState<PublicGroup[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')

  // STAVY PRO VYTVOŘENÍ SKUPINY
  const [groupType, setGroupType] = useState<'private' | 'public'>('private')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [privateSearchQuery, setPrivateSearchQuery] = useState('')
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([])

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

  // NAČTENÍ KONTAKTŮ, SE KTERÝMI SI UŽIVATEL PSAL, A JEHO SKUPIN
  useEffect(() => {
    const init = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (myProfile) setCurrentUserProfile(myProfile)

      // Načtení aktivních uživatelů z historie chatu
      const { data: userMessages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      if (userMessages) {
        const activePartnerIds = Array.from(
          new Set(
            userMessages.map((msg) =>
              msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
            ).filter(Boolean)
          )
        )

        if (activePartnerIds.length > 0) {
          const { data: activeProfiles } = await supabase
            .from('profiles')
            .select('*')
            .in('id', activePartnerIds)

          if (activeProfiles) {
            const sorted = activePartnerIds
              .map((id) => activeProfiles.find((p) => p.id === id))
              .filter((p): p is Profile => p !== undefined)
            setContacts(sorted)
          }
        }
      }

      // Načtení skupin, kterých je uživatel členem
      const { data: groupMemberships } = await supabase
        .from('group_members')
        .select('group_id, groups(*)')
        .eq('user_id', user.id)

      if (groupMemberships) {
        const fetchedGroups = groupMemberships
          .map((gm: any) => gm.groups)
          .filter(Boolean)
        setMyGroups(fetchedGroups)
      }
    }

    init()
  }, [router])

  // NAČTENÍ ÚČTŮ A VEŘEJNÝCH SKUPIN PRO MODÁLNÍ OKNO
  const openNewChatModal = async () => {
    setShowNewChatModal(true)
    if (!currentUserId) return
    const supabase = createClient()

    const { data: users } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .limit(50)

    if (users) setAllUsers(users)

    const { data: groups } = await supabase
      .from('groups')
      .select('*')
      .eq('is_private', false)
      .limit(20)

    if (groups) setPublicGroups(groups)
  }

  // NAČTENÍ DETAILU SKUPINY NEBO PROFILU V CHATU
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const fetchProfileOrGroupMessages = async () => {
      if (activeUserId) {
        setActiveGroup(null)
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', activeUserId)
          .single()

        if (profile) setActiveProfile(profile)

        const { data: oldMessages } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true })

        setMessages(oldMessages || [])
        setTimeout(scrollToBottom, 50)
      } else if (activeGroupId) {
        setActiveProfile(null)
        const { data: group } = await supabase
          .from('groups')
          .select('*')
          .eq('id', activeGroupId)
          .single()

        if (group) setActiveGroup(group)

        const { data: groupMsgs } = await supabase
          .from('messages')
          .select('*')
          .eq('group_id', activeGroupId)
          .order('created_at', { ascending: true })

        setMessages(groupMsgs || [])
        setTimeout(scrollToBottom, 50)
      } else {
        setActiveProfile(null)
        setActiveGroup(null)
      }
    }

    fetchProfileOrGroupMessages()
    setIsTyping(false)
  }, [activeUserId, activeGroupId, currentUserId])

  // REALTIME POSLECH PREZENCE A ZPRÁV
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
        if (payload.sender_id === activeUserId || (payload.group_id && payload.group_id === activeGroupId)) {
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
  }, [currentUserId, activeUserId, activeGroupId])

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
    if (!currentUserId) return
    const supabase = createClient()

    const fullPayload: any = {
      sender_id: currentUserId,
      content: payload.content || '',
      media_url: payload.media_url || null,
      created_at: new Date().toISOString()
    }

    if (activeUserId) {
      fullPayload.receiver_id = activeUserId
    } else if (activeGroupId) {
      fullPayload.group_id = activeGroupId
    } else {
      return
    }

    const { data: savedMsg, error } = await supabase
      .from('messages')
      .insert(fullPayload)
      .select()
      .single()

    if (error) console.error('Chyba při ukládání:', error)

    const msgToSend = savedMsg || { ...fullPayload, id: crypto.randomUUID() }

    if (activeUserId) {
      await supabase.channel(`chat_signal_${activeUserId}`).send({
        type: 'broadcast',
        event: 'direct-message',
        payload: msgToSend
      })
    }

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
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

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
    if (msg.media_url) {
      return <img src={msg.media_url} alt="Obrázek" className="rounded-2xl max-w-full max-h-72 object-cover shadow-sm" />
    }
    return msg.content
  }

  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUserId) return
    const supabase = createClient()

    const { data: newGroup, error: groupErr } = await supabase
      .from('groups')
      .insert({
        name: groupName.trim(),
        description: groupDescription.trim() || null,
        is_private: groupType === 'private',
        created_by: currentUserId
      })
      .select()
      .single()

    if (groupErr || !newGroup) {
      alert('Chyba při vytváření skupiny.')
      return
    }

    const membersToInsert = Array.from(new Set([...selectedGroupMembers, currentUserId])).map((memberId) => ({
      group_id: newGroup.id,
      user_id: memberId
    }))

    await supabase.from('group_members').insert(membersToInsert)

    setMyGroups((prev) => [...prev, newGroup])
    setShowNewChatModal(false)
    setGroupName('')
    setGroupDescription('')
    setSelectedGroupMembers([])
    router.push(`/chat?groupId=${newGroup.id}`)
  }

  const filteredContacts = contacts.filter((c) => {
    const name = c.username || c.first_name || c.full_name || 'Uživatel'
    return name.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const filteredAllUsers = allUsers.filter((u) => {
    const name = u.username || u.first_name || u.full_name || 'Uživatel'
    return name.toLowerCase().includes(userSearchQuery.toLowerCase())
  })

  const filteredPublicGroups = publicGroups.filter((g) =>
    g.name.toLowerCase().includes(userSearchQuery.toLowerCase())
  )

  const filteredPrivateContacts = contacts.filter((c) => {
    const name = c.username || c.first_name || c.full_name || 'Uživatel'
    return name.toLowerCase().includes(privateSearchQuery.toLowerCase())
  })

  const toggleGroupMember = (userId: string) => {
    setSelectedGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  return (
    <div className="flex w-full h-full min-h-screen bg-white overflow-hidden relative font-sans" onClick={() => setSelectedMsgMenu(null)}>
      
      {/* SEZNAM AKTIVNÍCH CHATŮ A SKUPIN */}
      {(!activeUserId && !activeGroupId) && (
        <div className="w-full flex flex-col h-full bg-white">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Konverzace</h1>
            </div>
            <button
              onClick={openNewChatModal}
              className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 active:scale-95 transition-all"
            >
              <PlusIcon />
            </button>
          </div>

          <div className="px-5 py-3">
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

          <div className="flex-1 overflow-y-auto p-3 space-y-4">
            {myGroups.length > 0 && (
              <div>
                <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-2">Moje Skupiny</span>
                <div className="mt-2 space-y-1">
                  {myGroups.map((group) => (
                    <div
                      key={group.id}
                      onClick={() => router.push(`/chat?groupId=${group.id}`)}
                      className="flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all text-slate-700"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-500 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                        👥
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate text-slate-900">{group.name}</h3>
                        <p className="text-xs truncate text-slate-400">{group.description || 'Skupinový chat'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider px-2">Lidé</span>
              <div className="mt-2 space-y-1">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-medium">
                    Zatím nemáte žádné aktivní osobní konverzace.
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isOnline = onlineUsers.has(contact.id)
                    const displayName = contact.username || contact.first_name || contact.full_name || 'Uživatel'
                    return (
                      <div
                        key={contact.id}
                        onClick={() => router.push(`/chat?userId=${contact.id}`)}
                        className="flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all text-slate-700"
                      >
                        <div className="relative shrink-0">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center font-bold text-lg bg-indigo-50 text-indigo-600">
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
                            <h3 className="font-bold text-sm truncate text-slate-900">{displayName}</h3>
                          </div>
                          <p className="text-xs truncate text-slate-400">
                            {isOnline ? 'Online' : formatLastSeen(contact.last_seen)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAIL CHATU */}
      {(activeUserId || activeGroupId) && (
        <div className="w-full h-screen flex flex-col bg-white overflow-hidden">
          
          <div className="h-20 px-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0 shadow-xs z-10">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/chat')} 
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all shrink-0"
              >
                <ArrowLeftIcon />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-slate-100">
                  {activeGroupId ? (
                    '👥'
                  ) : activeProfile?.avatar_url ? (
                    <img src={activeProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (activeProfile?.username || activeProfile?.first_name || activeProfile?.full_name || 'P').substring(0, 2).toUpperCase()
                  )}
                </div>

                <div className="flex flex-col">
                  <h2 className="font-bold text-slate-900 text-base leading-snug truncate max-w-[160px] sm:max-w-[240px]">
                    {activeGroupId ? activeGroup?.name : (activeProfile?.username || activeProfile?.first_name || activeProfile?.full_name || 'Uživatel')}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium truncate">
                    {activeGroupId ? (activeGroup?.description || 'Skupina') : onlineUsers.has(activeProfile?.id || '') ? 'Online' : formatLastSeen(activeProfile?.last_seen)}
                  </span>
                </div>
              </div>
            </div>

            {activeUserId && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => startCall('audio')} 
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95"
                >
                  <PhoneIcon />
                </button>
                <button 
                  onClick={() => startCall('video')} 
                  className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95"
                >
                  <VideoIcon />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`flex flex-col max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                    <div 
                      onContextMenu={(e) => handleContextMenu(e, msg)}
                      className={`px-4 py-2.5 rounded-2xl text-sm font-medium transition-all select-none ${
                        isMine 
                          ? 'bg-[#4F46E5] text-white rounded-br-none shadow-sm' 
                          : 'bg-white text-slate-800 rounded-bl-none border border-slate-100 shadow-xs'
                      }`}
                    >
                      {renderMessageContent(msg)}
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium px-1 mt-1">
                      {formatTimeOnly(msg.created_at)}
                    </span>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* SPODNÍ VSTUPNÍ POLE POUZE S TLAČÍTKEM PLUS NA FOTKY */}
          <div className="p-3 border-t border-slate-100 bg-white shrink-0 relative">
            {isTyping && (
              <div className="px-2 pb-2 text-xs text-indigo-600 font-semibold animate-pulse">
                píše zprávu...
              </div>
            )}

            {showAttachMenu && (
              <div className="p-2 border-b border-slate-100 bg-white flex gap-2 mb-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                  <ImageIcon />
                  <span>Obrázek</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="w-11 h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center shrink-0 transition-all"
              >
                <PlusIcon />
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={handleInputChange}
                placeholder="Napište zprávu..."
                className="flex-1 px-4 py-3 bg-slate-100/70 focus:bg-slate-100 border border-transparent rounded-2xl text-sm outline-none transition-all text-slate-900"
              />

              <button 
                type="submit" 
                disabled={!newMessage.trim()} 
                className="w-11 h-11 rounded-2xl bg-[#4F46E5] disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition-all shadow-sm active:scale-95"
              >
                <SendIcon />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* MODÁLNÍ OKNO PRO TLAČÍTKO PLUS */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-[250] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh]">
            
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex gap-1.5 p-1 bg-slate-200/60 rounded-2xl">
                <button
                  onClick={() => setActiveModalTab('search')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeModalTab === 'search' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Hledat účty & Skupiny
                </button>
                <button
                  onClick={() => setActiveModalTab('group')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeModalTab === 'group' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Vytvořit skupinu
                </button>
              </div>

              <button onClick={() => setShowNewChatModal(false)} className="w-8 h-8 rounded-full bg-slate-200/80 text-slate-600 flex items-center justify-center">
                <CloseIcon />
              </button>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {activeModalTab === 'search' ? (
                <div>
                  <div className="relative mb-4">
                    <span className="absolute left-3.5 top-3 text-slate-400">
                      <SearchIcon />
                    </span>
                    <input
                      type="text"
                      placeholder="Vyhledat uživatele nebo veřejnou skupinu..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {filteredPublicGroups.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Veřejné skupiny</h4>
                      <div className="space-y-1">
                        {filteredPublicGroups.map((g) => (
                          <div
                            key={g.id}
                            onClick={() => {
                              setShowNewChatModal(false)
                              router.push(`/chat?groupId=${g.id}`)
                            }}
                            className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-indigo-50/60 cursor-pointer transition-all border border-slate-100"
                          >
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">
                              <UsersIcon />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-sm text-slate-900 truncate">{g.name}</h4>
                              <p className="text-[10px] text-slate-400 truncate">{g.description || 'Veřejná skupina'}</p>
                            </div>
                            <span className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-2.5 py-1 rounded-full">Otevřít</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Uživatelé</h4>
                    <div className="space-y-1">
                      {filteredAllUsers.length === 0 ? (
                        <div className="text-center py-6 text-xs text-slate-400">Žádní uživatelé nenalezeni.</div>
                      ) : (
                        filteredAllUsers.map((u) => {
                          const name = u.username || u.first_name || u.full_name || 'Uživatel'
                          return (
                            <div
                              key={u.id}
                              onClick={() => {
                                setShowNewChatModal(false)
                                router.push(`/chat?userId=${u.id}`)
                              }}
                              className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-indigo-50/60 cursor-pointer transition-all"
                            >
                              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center overflow-hidden shrink-0">
                                {u.avatar_url ? (
                                  <img src={u.avatar_url} alt={name} className="w-full h-full object-cover" />
                                ) : (
                                  name.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm text-slate-900 truncate">{name}</h4>
                                <p className="text-[10px] text-slate-400">Kliknutím zahájíte chat</p>
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-100 rounded-2xl">
                    <button
                      onClick={() => setGroupType('private')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        groupType === 'private' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      <LockIcon />
                      <span>Soukromá</span>
                    </button>
                    <button
                      onClick={() => setGroupType('public')}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                        groupType === 'public' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      <GlobeIcon />
                      <span>Veřejná</span>
                    </button>
                  </div>

                  <div className="mb-3">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Název skupiny</label>
                    <input
                      type="text"
                      placeholder="Zadejte název skupiny..."
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  {groupType === 'public' ? (
                    <div className="mb-4">
                      <label className="block text-xs font-bold text-slate-700 mb-1">Popis skupiny (volitelné)</label>
                      <textarea
                        rows={3}
                        placeholder="O čem tato veřejná skupina je..."
                        value={groupDescription}
                        onChange={(e) => setGroupDescription(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                      />
                    </div>
                  ) : (
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-slate-700 mb-1">
                        Přidat členy (z uživatelů, se kterými jste si již psali)
                      </h4>
                      
                      <div className="relative mb-2">
                        <span className="absolute left-3 top-2.5 text-slate-400">
                          <SearchIcon />
                        </span>
                        <input
                          type="text"
                          placeholder="Vyhledat v kontaktech..."
                          value={privateSearchQuery}
                          onChange={(e) => setPrivateSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 bg-slate-100 rounded-xl text-xs outline-none"
                        />
                      </div>

                      <div className="space-y-1 max-h-40 overflow-y-auto border border-slate-100 rounded-2xl p-1">
                        {filteredPrivateContacts.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">
                            Nenalezen žádný kontakt z vašich předchozích zpráv.
                          </div>
                        ) : (
                          filteredPrivateContacts.map((c) => {
                            const name = c.username || c.first_name || c.full_name || 'Uživatel'
                            const isSelected = selectedGroupMembers.includes(c.id)
                            return (
                              <div
                                key={c.id}
                                onClick={() => toggleGroupMember(c.id)}
                                className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer transition-all ${
                                  isSelected ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                                }`}
                              >
                                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center overflow-hidden shrink-0 text-xs">
                                  {c.avatar_url ? (
                                    <img src={c.avatar_url} alt={name} className="w-full h-full object-cover" />
                                  ) : (
                                    name.substring(0, 2).toUpperCase()
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-bold text-xs text-slate-900 truncate">{name}</h4>
                                </div>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => {}}
                                  className="w-4 h-4 text-indigo-600 rounded-md focus:ring-0"
                                />
                              </div>
                            )
                          })
                        )}
                      </div>
                    </div>
                  )}

                  <button
                    disabled={!groupName.trim()}
                    onClick={handleCreateGroup}
                    className="w-full py-3 bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95"
                  >
                    {groupType === 'private' 
                      ? `Vytvořit soukromou skupinu (${selectedGroupMembers.length} členů)`
                      : 'Vytvořit veřejnou skupinu'}
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* KONTEXTOVÉ MENU NA ZPRÁVĚ */}
      {selectedMsgMenu && (
        <div 
          className="fixed z-[300] bg-white border border-slate-200 rounded-2xl shadow-2xl p-1.5 min-w-[150px]"
          style={{ top: selectedMsgMenu.y, left: selectedMsgMenu.x }}
        >
          {selectedMsgMenu.msg.content && (
            <button onClick={copyMessage} className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl">
              📋 Zkopírovat
            </button>
          )}
          <button onClick={deleteMessageLocally} className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl">
            🗑️ Odstranit
          </button>
        </div>
      )}

      {/* HOVOR OVERLAY */}
      {callStatus !== 'idle' && (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] flex flex-col items-center justify-between p-8 text-white">
          <div className="text-center mt-8">
            <h3 className="text-2xl font-black mb-1">{activeProfile?.username || activeProfile?.first_name || activeProfile?.full_name}</h3>
            <p className="text-xs text-slate-400 uppercase font-semibold">
              {callStatus === 'calling' && 'Volám...'}
              {callStatus === 'incoming' && 'Příchozí hovor...'}
              {callStatus === 'connected' && 'Probíhá hovor'}
            </p>
          </div>

          {callType === 'video' && (
            <div className="relative w-full max-w-2xl aspect-video bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 my-4">
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <video ref={localVideoRef} autoPlay playsInline muted className="absolute bottom-4 right-4 w-32 h-20 bg-slate-950 rounded-2xl object-cover" />
            </div>
          )}

          <div className="flex items-center gap-6 mb-8">
            {callStatus === 'incoming' ? (
              <>
                <button onClick={acceptCall} className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center">
                  <PhoneIcon />
                </button>
                <button onClick={endCall} className="w-16 h-16 rounded-3xl bg-rose-600 text-white flex items-center justify-center">
                  <PhoneOffIcon />
                </button>
              </>
            ) : (
              <button onClick={endCall} className="px-8 py-4 bg-rose-600 text-white font-bold rounded-2xl flex items-center gap-3">
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