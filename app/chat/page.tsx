'use client'

import { Suspense, useState, useEffect, useRef, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// --- IKONY ---
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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10z"/></svg>
)
const ZoomInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
)
const ZoomOutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
)

// --- GENERÁTOR 1000+ SAMOLEPEK & 3D EMOJI ---
const CUSTOM_3D_EMOJIS = [
  '🔥','🚀','💎','🎉','❤️','😍','😂','😎','🥳','🤩','✨','🌟','👏','🙌','💯','🤔','🙈','💩','👻','🎃',
  '👑','🍕','🍔','🎈','🎁','🦄','⚡','⚡','🏆','🎯','🎨','🎭','🎮','🎲','🎸','🎹','🍿','🍻','🥂','🌍',
  '⚡','💥','💫','🧿','🤖','👾','🦄','🐉','🍀','☀️'
]

const GENERATED_STICKERS = Array.from({ length: 1000 }, (_, i) => {
  const categories = ['happy', 'sad', 'love', 'funny', 'cool', 'cat', 'party', 'fire', 'star', 'crypto']
  const cat = categories[i % categories.length]
  return {
    id: `stk_${i + 1}`,
    name: `${cat} sticker ${i + 1}`,
    tags: [cat, `sticker${i + 1}`, 'emoji', '3d'],
    url: `https://picsum.photos/seed/sticker_${i + 1}/200/200`
  }
})

export type Profile = {
  id: string
  username?: string
  first_name?: string
  avatar_url?: string
  last_seen?: string
}

export type Group = {
  id: string
  name: string
  description?: string
  is_private: boolean
  avatar_url?: string
  isGroup?: boolean
}

export type ConversationItem = (Profile & { isGroup?: false }) | (Group & { isGroup: true })

export type Message = {
  id: string
  sender_id: string
  receiver_id?: string
  group_id?: string
  content: string
  media_url?: string
  sticker_url?: string
  created_at: string
}

export function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const activeUserId = searchParams.get('userId')
  const activeGroupId = searchParams.get('groupId')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  
  // Seznam aktivních konverzací (Uživatelé + Skupiny)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  // Aktivní detail
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')

  // Emojis & Samolepky
  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [stickerSearch, setStickerSearch] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Lightbox / Přiblížení Fotek
  const [activeZoomImage, setActiveZoomImage] = useState<string | null>(null)
  const [zoomScale, setZoomScale] = useState(1)

  // Modální okno Skupin
  const [showNewChatModal, setShowNewChatModal] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState<'search' | 'group'>('search')
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [publicGroups, setPublicGroups] = useState<Group[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')

  const [groupType, setGroupType] = useState<'private' | 'public'>('private')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [privateSearchQuery, setPrivateSearchQuery] = useState('')
  const [selectedGroupMembers, setSelectedGroupMembers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // --- NAČTENÍ POUZE CHATŮ S LIDMI A SKUPIN KDE JSEM ČLENEM ---
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

      // 1. Načíst osobní konverzace
      const { data: userMessages } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      const activePartnerIds = Array.from(
        new Set(
          (userMessages || []).map((msg) =>
            msg.sender_id === user.id ? msg.receiver_id : msg.sender_id
          )
        )
      )

      let userProfiles: Profile[] = []
      if (activePartnerIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', activePartnerIds)
        if (profiles) userProfiles = profiles
      }

      // 2. Načíst Skupiny ve kterých jsem členem
      const { data: myMemberships } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', user.id)

      let userGroups: Group[] = []
      if (myMemberships && myMemberships.length > 0) {
        const groupIds = myMemberships.map((m) => m.group_id)
        const { data: groups } = await supabase
          .from('groups')
          .select('*')
          .in('id', groupIds)
        if (groups) {
          userGroups = groups.map((g) => ({ ...g, isGroup: true }))
        }
      }

      // Sloučení do jednoho seznamu
      const combined: ConversationItem[] = [
        ...userGroups,
        ...userProfiles.map((p) => ({ ...p, isGroup: false as const }))
      ]

      setConversations(combined)
    }

    init()
  }, [router])

  // --- NAČTENÍ DETAILU CHATU NEBO SKUPINY ---
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    const fetchChatData = async () => {
      if (activeGroupId) {
        setActiveProfile(null)
        const { data: group } = await supabase.from('groups').select('*').eq('id', activeGroupId).single()
        if (group) setActiveGroup({ ...group, isGroup: true })

        const { data: gMessages } = await supabase
          .from('group_messages')
          .select('*')
          .eq('group_id', activeGroupId)
          .order('created_at', { ascending: true })

        if (gMessages) setMessages(gMessages)
      } else if (activeUserId) {
        setActiveGroup(null)
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', activeUserId).single()
        if (profile) setActiveProfile(profile)

        const { data: dMessages } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`)
          .order('created_at', { ascending: true })

        if (dMessages) setMessages(dMessages)
      } else {
        setActiveProfile(null)
        setActiveGroup(null)
      }
      setTimeout(scrollToBottom, 50)
    }

    fetchChatData()
  }, [activeUserId, activeGroupId, currentUserId])

  // --- FILTER SAMOLEPEK BEZ ZAPADÁVÁNÍ ---
  const filteredStickers = useMemo(() => {
    if (!stickerSearch.trim()) return GENERATED_STICKERS.slice(0, 60)
    const term = stickerSearch.toLowerCase()
    return GENERATED_STICKERS.filter(
      (s) => s.name.toLowerCase().includes(term) || s.tags.some((t) => t.includes(term))
    ).slice(0, 80)
  }, [stickerSearch])

  // --- ODESILÁNÍ ZPRÁV ---
  const sendPayload = async (payload: Partial<Message>) => {
    if (!currentUserId) return
    const supabase = createClient()

    if (activeGroupId) {
      const fullPayload = {
        group_id: activeGroupId,
        sender_id: currentUserId,
        content: payload.content || '',
        media_url: payload.media_url || null,
        sticker_url: payload.sticker_url || null,
        created_at: new Date().toISOString()
      }
      const { data } = await supabase.from('group_messages').insert(fullPayload).select().single()
      if (data) setMessages((prev) => [...prev, data])
    } else if (activeUserId) {
      const fullPayload = {
        sender_id: currentUserId,
        receiver_id: activeUserId,
        content: payload.content || '',
        media_url: payload.media_url || null,
        sticker_url: payload.sticker_url || null,
        created_at: new Date().toISOString()
      }
      const { data } = await supabase.from('messages').insert(fullPayload).select().single()
      if (data) setMessages((prev) => [...prev, data])
    }
    scrollToBottom()
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    sendPayload({ content: newMessage.trim() })
    setNewMessage('')
    setShowAttachMenu(false)
    setShowStickerPicker(false)
    setShowEmojiPicker(false)
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

  // --- VYTVOŘENÍ SKUPINY V SUPABASE ---
  const handleCreateGroup = async () => {
    if (!groupName.trim() || !currentUserId) return
    const supabase = createClient()

    // 1. Vytvořit skupinu v Supabase
    const { data: newGroup, error } = await supabase
      .from('groups')
      .insert({
        name: groupName,
        description: groupDescription,
        is_private: groupType === 'private',
        created_by: currentUserId
      })
      .select()
      .single()

    if (error || !newGroup) {
      alert('Chyba při vytváření skupiny!')
      return
    }

    // 2. Přidat tvůrce i vybrané členy
    const membersToInsert = [
      { group_id: newGroup.id, user_id: currentUserId, role: 'admin' },
      ...selectedGroupMembers.map((uid) => ({
        group_id: newGroup.id,
        user_id: uid,
        role: 'member'
      }))
    ]

    await supabase.from('group_members').insert(membersToInsert)

    // 3. Aktualizovat UI
    setConversations((prev) => [{ ...newGroup, isGroup: true }, ...prev])
    setShowNewChatModal(false)
    setGroupName('')
    setGroupDescription('')
    setSelectedGroupMembers([])
    router.push(`/chat?groupId=${newGroup.id}`)
  }

  // Načtení dat pro Modal Tlačítka Plus
  const openNewChatModal = async () => {
    setShowNewChatModal(true)
    if (!currentUserId) return
    const supabase = createClient()

    const { data: users } = await supabase.from('profiles').select('*').neq('id', currentUserId).limit(50)
    if (users) setAllUsers(users)

    const { data: groups } = await supabase.from('groups').select('*').eq('is_private', false).limit(20)
    if (groups) setPublicGroups(groups)
  }

  return (
    <div className="flex w-full h-full min-h-screen bg-slate-50 font-sans overflow-hidden relative">
      
      {/* SEZNAM AKTIVNÍCH CHATŮ A SKUPIN */}
      {(!activeUserId && !activeGroupId) && (
        <div className="w-full flex flex-col h-full bg-white border-r border-slate-100">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Konverzace</h1>
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
                placeholder="Hledat v konverzacích a skupinách..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-indigo-500/30 rounded-2xl text-xs outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-1">
            {conversations.length === 0 ? (
              <div className="text-center py-16 text-slate-400 text-sm font-medium">
                Zatím nemáte žádné konverzace ani skupiny.
              </div>
            ) : (
              conversations
                .filter((item) => {
                  const name = item.isGroup ? item.name : (item.username || item.first_name || '')
                  return name.toLowerCase().includes(searchQuery.toLowerCase())
                })
                .map((item) => {
                  if (item.isGroup) {
                    return (
                      <div
                        key={`grp_${item.id}`}
                        onClick={() => router.push(`/chat?groupId=${item.id}`)}
                        className="flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all text-slate-700"
                      >
                        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg shrink-0">
                          <UsersIcon />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-sm truncate text-slate-900">{item.name}</h3>
                          <p className="text-xs truncate text-slate-400">
                            {item.is_private ? 'Soukromá skupina' : 'Veřejná skupina'}
                          </p>
                        </div>
                      </div>
                    )
                  }

                  const displayName = item.username || item.first_name || 'Uživatel'
                  return (
                    <div
                      key={`usr_${item.id}`}
                      onClick={() => router.push(`/chat?userId=${item.id}`)}
                      className="flex items-center gap-3.5 p-3 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all text-slate-700"
                    >
                      <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center overflow-hidden shrink-0">
                        {item.avatar_url ? (
                          <img src={item.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                        ) : (
                          displayName.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm truncate text-slate-900">{displayName}</h3>
                        <p className="text-xs truncate text-slate-400">Osobní chat</p>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>
      )}

      {/* DETAIL CHATU NEBO SKUPINY */}
      {(activeUserId || activeGroupId) && (
        <div className="w-full h-screen flex flex-col bg-white overflow-hidden">
          
          {/* HLAVIČKA CHATU */}
          <div className="h-20 px-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => router.push('/chat')} 
                className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-all shrink-0"
              >
                <ArrowLeftIcon />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center overflow-hidden shrink-0">
                  {activeGroup ? (
                    <UsersIcon />
                  ) : activeProfile?.avatar_url ? (
                    <img src={activeProfile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    (activeProfile?.username || 'U').substring(0, 2).toUpperCase()
                  )}
                </div>

                <div>
                  <h2 className="font-bold text-slate-900 text-base leading-snug">
                    {activeGroup ? activeGroup.name : (activeProfile?.username || activeProfile?.first_name || 'Uživatel')}
                  </h2>
                  <span className="text-xs text-slate-400 font-medium">
                    {activeGroup ? (activeGroup.is_private ? 'Soukromá skupina' : 'Veřejná skupina') : 'Aktivní konverzace'}
                  </span>
                </div>
              </div>
            </div>

            {!activeGroup && (
              <div className="flex items-center gap-2">
                <button className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <PhoneIcon />
                </button>
                <button className="w-10 h-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center">
                  <VideoIcon />
                </button>
              </div>
            )}
          </div>

          {/* ZPRÁVY */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
            {messages.map((msg) => {
              const isMine = msg.sender_id === currentUserId
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div className={`p-3 rounded-2xl text-sm font-medium ${
                    isMine ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                  }`}>
                    {msg.sticker_url ? (
                      <img src={msg.sticker_url} alt="Sticker" className="w-28 h-28 object-contain" />
                    ) : msg.media_url ? (
                      /* OBRÁZEK BEZ FIALOVÉHO OKRAJE S OTEVŘENÍM V LIGHTBOXU */
                      <img 
                        src={msg.media_url} 
                        alt="Photo" 
                        onClick={() => {
                          setActiveZoomImage(msg.media_url || null)
                          setZoomScale(1)
                        }}
                        className="rounded-xl max-w-xs max-h-60 object-cover cursor-pointer hover:opacity-95 transition-opacity outline-none border-0" 
                      />
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* VSTUPNÍ POLE S VYHLEDÁVÁNÍM SAMOLEPEK & 3D EMOJI */}
          <div className="p-3 border-t border-slate-100 bg-white shrink-0">
            
            {/* VYHLEDÁVÁNÍ SAMOLEPEK */}
            {showStickerPicker && (
              <div className="p-3 border border-slate-200 bg-slate-50 rounded-2xl mb-2 max-h-60 flex flex-col">
                <input
                  type="text"
                  placeholder="Vyhledat v 1000+ samolepkách..."
                  value={stickerSearch}
                  onChange={(e) => setStickerSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs mb-2 outline-none"
                />
                <div className="grid grid-cols-5 gap-2 overflow-y-auto flex-1 p-1">
                  {filteredStickers.map((s) => (
                    <button 
                      key={s.id} 
                      onClick={() => {
                        sendPayload({ sticker_url: s.url })
                        setShowStickerPicker(false)
                      }} 
                      className="p-1 bg-white rounded-xl border border-slate-100 hover:scale-105 transition-transform"
                    >
                      <img src={s.url} alt={s.name} className="w-full h-12 object-cover rounded-lg" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 3D EMOJI PANEL */}
            {showEmojiPicker && (
              <div className="p-3 border border-slate-200 bg-slate-50 rounded-2xl mb-2 max-h-48 overflow-y-auto grid grid-cols-8 gap-2 text-xl">
                {CUSTOM_3D_EMOJIS.map((e, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setNewMessage((prev) => prev + e)}
                    className="hover:scale-125 transition-transform p-1 text-center"
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}

            {/* PANEL PŘIPOJENÍ */}
            {showAttachMenu && (
              <div className="p-2 border border-slate-100 bg-white rounded-2xl flex gap-2 mb-2">
                <label className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-xl text-xs font-bold text-slate-700 cursor-pointer">
                  <ImageIcon />
                  <span>Obrázek</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <button 
                  onClick={() => { setShowStickerPicker(!showStickerPicker); setShowEmojiPicker(false); }} 
                  className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold"
                >
                  <StickerIcon />
                  <span>Samolepky (1000+)</span>
                </button>
                <button 
                  onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowStickerPicker(false); }} 
                  className="flex items-center gap-2 px-3 py-2 bg-amber-50 text-amber-600 rounded-xl text-xs font-bold"
                >
                  <span>😀 3D Emojis</span>
                </button>
              </div>
            )}

            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0"
              >
                <PlusIcon />
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Napište zprávu..."
                className="flex-1 px-4 py-3 bg-slate-100 border border-transparent rounded-2xl text-sm outline-none text-slate-900"
              />

              <button 
                type="submit" 
                disabled={!newMessage.trim()} 
                className="w-11 h-11 rounded-2xl bg-indigo-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0"
              >
                <SendIcon />
              </button>
            </form>
          </div>

        </div>
      )}

      {/* LIGHTBOX / ZOOM OKNO FOTKY */}
      {activeZoomImage && (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="absolute top-4 right-4 flex items-center gap-3 z-10">
            <button 
              onClick={() => setZoomScale((s) => Math.min(s + 0.5, 4))} 
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <ZoomInIcon />
            </button>
            <button 
              onClick={() => setZoomScale((s) => Math.max(s - 0.5, 1))} 
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <ZoomOutIcon />
            </button>
            <button 
              onClick={() => setActiveZoomImage(null)} 
              className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="w-full h-full flex items-center justify-center overflow-hidden">
            <img 
              src={activeZoomImage} 
              alt="Zoomed" 
              style={{ transform: `scale(${zoomScale})` }}
              className="max-w-full max-h-full object-contain transition-transform duration-200 select-none cursor-grab active:cursor-grabbing border-0 outline-none" 
            />
          </div>
        </div>
      )}

      {/* MODÁL PRO VYTVOŘENÍ SKUPINY / HLEDÁNÍ */}
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
                  <input
                    type="text"
                    placeholder="Vyhledat uživatele nebo skupinu..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-100 rounded-2xl text-xs mb-4 outline-none"
                  />

                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Veřejné skupiny</h4>
                  {publicGroups.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setShowNewChatModal(false)
                        router.push(`/chat?groupId=${g.id}`)
                      }}
                      className="p-2.5 rounded-2xl border border-slate-100 mb-1 cursor-pointer hover:bg-slate-50 flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <UsersIcon />
                      </div>
                      <span className="font-bold text-xs">{g.name}</span>
                    </div>
                  ))}

                  <h4 className="text-xs font-bold text-slate-400 uppercase mt-4 mb-2">Uživatelé</h4>
                  {allUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setShowNewChatModal(false)
                        router.push(`/chat?userId=${u.id}`)
                      }}
                      className="p-2.5 rounded-2xl hover:bg-slate-50 cursor-pointer flex items-center gap-3"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center text-xs">
                        {(u.username || 'U').substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-xs">{u.username || u.first_name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-4 p-1 bg-slate-100 rounded-2xl">
                    <button
                      onClick={() => setGroupType('private')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold ${
                        groupType === 'private' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      <LockIcon />
                      <span>Soukromá</span>
                    </button>
                    <button
                      onClick={() => setGroupType('public')}
                      className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold ${
                        groupType === 'public' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                      }`}
                    >
                      <GlobeIcon />
                      <span>Veřejná</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Název skupiny..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-100 rounded-2xl text-xs mb-3 outline-none"
                  />

                  <textarea
                    rows={2}
                    placeholder="Popis skupiny..."
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-100 rounded-2xl text-xs mb-3 outline-none resize-none"
                  />

                  <button
                    disabled={!groupName.trim()}
                    onClick={handleCreateGroup}
                    className="w-full py-3 bg-indigo-600 disabled:opacity-50 text-white font-bold text-xs rounded-2xl shadow-md transition-all active:scale-95"
                  >
                    Vytvořit skupinu
                  </button>
                </div>
              )}
            </div>

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