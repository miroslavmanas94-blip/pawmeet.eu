'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// --- TYPY ---
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

export default function ChatPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const activeUserId = searchParams.get('userId')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  
  // Stavy pro levý panel (Seznam kontaktů)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loadingContacts, setLoadingContacts] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Stavy pro pravý panel (Aktivní konverzace)
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  // Realtime sledování online uživatelů
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // 1. INICIALIZACE A NAČTENÍ SEZNAMU KONTAKTŮ
  useEffect(() => {
    const initData = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }
      setCurrentUserId(user.id)

      // Načtení všech zpráv uživatele pro vytvoření seznamu kontaktů
      const { data: msgs } = await supabase
        .from('messages')
        .select('sender_id, receiver_id, content, created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })

      // Načtení profilů
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')

      if (msgs && profiles) {
        // Zpracování unikátních kontaktů a jejich poslední zprávy
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

        // Přidání uživatele z URL (pokud v historii ještě není)
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

  // 2. NAČTENÍ AKTIVNÍ KONVERZACE A PROFILU
  useEffect(() => {
    if (!currentUserId || !activeUserId) return

    const loadActiveChat = async () => {
      setLoadingMessages(true)
      const supabase = createClient()

      // Hned najdeme profil v kontaktech pro okamžité načtení jména
      const existingContact = contacts.find(c => c.id === activeUserId)
      if (existingContact) {
        setActiveProfile(existingContact)
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .eq('id', activeUserId)
          .single()
        if (profile) setActiveProfile(profile)
      }

      // Načtení zpráv
      const { data: chatMsgs } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (chatMsgs) setMessages(chatMsgs as Message[])
      setLoadingMessages(false)
      scrollToBottom()
    }

    loadActiveChat()
  }, [activeUserId, currentUserId, contacts])

  // 3. REALTIME ZPRÁVY & ONLINE STATUS (PRESENCE)
  useEffect(() => {
    if (!currentUserId) return
    const supabase = createClient()

    // Sledování nových zpráv
    const messageChannel = supabase.channel('chat-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        const newMsg = payload.new as Message
        // Pokud zpráva patří do otevřeného chatu
        if (
          (newMsg.sender_id === currentUserId && newMsg.receiver_id === activeUserId) ||
          (newMsg.sender_id === activeUserId && newMsg.receiver_id === currentUserId)
        ) {
          setMessages((prev) => [...prev, newMsg])
          scrollToBottom()
        }
        
        // Aktualizace posledních zpráv v levém panelu
        setContacts((prev) => {
          const otherId = newMsg.sender_id === currentUserId ? newMsg.receiver_id : newMsg.sender_id
          const updated = [...prev]
          const index = updated.findIndex((c) => c.id === otherId)
          if (index !== -1) {
            updated[index].lastMessage = newMsg.content
            updated[index].lastMessageTime = newMsg.created_at
            // Posuneme kontakt nahoru
            const [moved] = updated.splice(index, 1)
            updated.unshift(moved)
          }
          return updated
        })
      })
      .subscribe()

    // Sledování online stavu uživatelů (Presence)
    const presenceChannel = supabase.channel('online-users', {
      config: { presence: { key: currentUserId } }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const activeIds = new Set(Object.keys(state))
        setOnlineUsers(activeIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(presenceChannel)
    }
  }, [currentUserId, activeUserId])

  // 4. ODESLÁNÍ ZPRÁVY
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId || !activeUserId) return

    const supabase = createClient()
    const textToSend = newMessage.trim()
    setNewMessage('') // okamžité vyčištění pole

    await supabase.from('messages').insert({
      sender_id: currentUserId,
      receiver_id: activeUserId,
      content: textToSend,
    })
  }

  // Zformátování času
  const formatTime = (isoString?: string) => {
    if (!isoString) return ''
    const date = new Date(isoString)
    return date.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredContacts = contacts.filter((c) =>
    (c.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    // Celá obrazovka (odpočítán prostor pro spodní lištu na mobilu, na PC plná výška)
    <div className="flex w-full h-[calc(100vh-80px)] bg-white overflow-hidden max-w-[1400px] mx-auto border-x border-neutral-200/60 shadow-2xl">
      
      {/* LEVÝ PANEL - SEZNAM KONTAKTŮ */}
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
              className="w-full pl-9 pr-4 py-2.5 bg-neutral-100 rounded-2xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {loadingContacts ? (
            <div className="text-center text-xs text-neutral-400 mt-10">Načítám zprávy...</div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center text-xs text-neutral-400 mt-10">
              Žádné konverzace. Najděte někoho v hledání!
            </div>
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
                    {/* Zelený bod pro ONLINE status */}
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

      {/* PRAVÝ PANEL - AKTIVNÍ CHAT */}
      <div className={`flex-1 flex-col bg-white ${!activeUserId ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
        {!activeUserId ? (
          <div className="text-center text-neutral-400 flex flex-col items-center">
            <div className="w-24 h-24 bg-neutral-50 rounded-full flex items-center justify-center text-4xl mb-4 border border-neutral-100">💬</div>
            <h2 className="text-lg font-bold text-neutral-700">Vaše zprávy</h2>
            <p className="text-sm mt-1">Vyberte konverzaci z levého panelu.</p>
          </div>
        ) : (
          <>
            {/* HLAVIČKA CHATU */}
            <div className="h-[72px] px-4 border-b border-neutral-200/80 flex items-center gap-4 bg-white/95 backdrop-blur-sm z-10 shadow-sm">
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

              <div className="flex-1 cursor-pointer" onClick={() => router.push(`/profile/${activeProfile?.id}`)}>
                <h2 className="font-bold text-base leading-tight">
                  {activeProfile?.username || 'Načítám...'}
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
                  const showTime = index === 0 || new Date(msg.created_at).getTime() - new Date(messages[index-1].created_at).getTime() > 5 * 60000;

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

            {/* POLE PRO ODESLÁNÍ ZPRÁVY */}
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
                className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white disabled:opacity-50 hover:bg-indigo-700 hover:scale-105 transition-all shadow-md active:scale-95"
              >
                <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
              </button>
            </form>
          </>
        )}
      </div>

    </div>
  )
}