'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import VideoCallOverlay from '@/components/VideoCallOverlay'

type Message = {
  id: string
  sender_id: string
  receiver_id: string
  content: string
  media_url?: string
  message_type: 'text' | 'image' | 'audio' | 'vanish'
  reactions: Record<string, string>
  created_at: string
}

type ChatUser = {
  id: string
  name: string
  avatar: string
  lastMessage?: string
  isOnline?: boolean
}

export default function ChatPage() {
  const supabase = createClient()
  const [users, setUsers] = useState<ChatUser[]>([])
  const [activeUserId, setActiveUserId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputText, setInputText] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isCalling, setIsCalling] = useState(false)
  const [callType, setCallType] = useState<'audio' | 'video'>('video')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const activeUser = users.find((u) => u.id === activeUserId)

  // Načtení přihlášeného uživatele a všech registrovaných profilů ze Supabase
  useEffect(() => {
    const loadUserAndProfiles = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      const { data: profiles } = await supabase.from('profiles').select('*')
      if (profiles) {
        const loadedUsers: ChatUser[] = profiles
          .filter((p) => p.id !== user?.id) // Vynechá přihlášeného uživatele ze seznamu
          .map((p) => ({
            id: p.id,
            name: p.full_name || 'Uživatel',
            avatar: p.avatar_url || '👤',
            lastMessage: '',
            isOnline: true
          }))

        setUsers(loadedUsers)
        if (loadedUsers.length > 0 && !activeUserId) {
          setActiveUserId(loadedUsers[0].id)
        }
      }
    }

    loadUserAndProfiles()

    // Sledování nových registrací v reálném čase
    const profilesChannel = supabase
      .channel('public:profiles')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
        loadUserAndProfiles()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(profilesChannel)
    }
  }, [])

  // Načtení zpráv a realtime odchytávání nových zpráv
  useEffect(() => {
    if (!activeUserId || !currentUserId) return

    let channel: ReturnType<typeof supabase.channel> | null = null

    const initChat = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true })

      if (data) setMessages(data as Message[])

      channel = supabase.channel(`chat_${currentUserId}_${activeUserId}`)
      channel
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        })
        .subscribe()
    }

    initChat()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  }, [activeUserId, currentUserId])

  const sendMessage = async (type: 'text' | 'vanish' = 'text', mediaUrl?: string) => {
    if ((!inputText.trim() && !mediaUrl) || !currentUserId || !activeUserId) return

    const newMessage = {
      sender_id: currentUserId,
      receiver_id: activeUserId,
      content: inputText,
      media_url: mediaUrl,
      message_type: type
    }

    setInputText('')
    await supabase.from('messages').insert(newMessage)
  }

  const addReaction = async (msgId: string, emoji: string) => {
    if (!currentUserId) return
    const msg = messages.find((m) => m.id === msgId)
    if (!msg) return

    const updatedReactions = { ...msg.reactions, [currentUserId]: emoji }
    await supabase.from('messages').update({ reactions: updatedReactions }).eq('id', msgId)
  }

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-white overflow-hidden">
      {/* Levý panel: Seznam konverzací */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-800 flex flex-col bg-slate-900/40 ${activeUserId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Zprávy</h2>
          <span className="text-xs bg-indigo-600/20 text-indigo-400 px-2 py-1 rounded-full font-semibold">Direct</span>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
          {users.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500">Žádní další uživatelé nebyly nalezeni.</div>
          ) : (
            users.map((user) => {
              const isSelected = user.id === activeUserId
              return (
                <button
                  key={user.id}
                  onClick={() => setActiveUserId(user.id)}
                  className={`w-full p-3.5 flex items-center gap-3 transition-colors text-left hover:bg-slate-800/50 ${
                    isSelected ? 'bg-slate-800/80 border-l-4 border-indigo-500' : ''
                  }`}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-xl overflow-hidden">
                      {user.avatar?.startsWith('http') ? (
                        <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                      ) : (
                        user.avatar
                      )}
                    </div>
                    {user.isOnline && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <h4 className="font-semibold text-sm truncate">{user.name}</h4>
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{user.lastMessage || 'Zatím žádné zprávy'}</p>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Pravý panel: Aktivní CHAT */}
      <div className={`flex-1 flex flex-col h-full bg-slate-950 ${!activeUserId ? 'hidden md:flex' : 'flex'}`}>
        {activeUser ? (
          <>
            {/* Hlavička Chatu */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveUserId(null)}
                  className="md:hidden p-2 text-slate-400 hover:text-white"
                >
                  ←
                </button>
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-lg overflow-hidden">
                  {activeUser.avatar?.startsWith('http') ? (
                    <img src={activeUser.avatar} alt={activeUser.name} className="w-full h-full object-cover" />
                  ) : (
                    activeUser.avatar
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm">{activeUser.name}</h3>
                  <p className="text-[10px] text-emerald-400">
                    {activeUser.isOnline ? 'Aktivní nyní' : 'Není online'}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 text-xl">
                <button onClick={() => { setCallType('audio'); setIsCalling(true) }} className="hover:scale-110 transition-transform">📞</button>
                <button onClick={() => { setCallType('video'); setIsCalling(true) }} className="hover:scale-110 transition-transform">📹</button>
              </div>
            </div>

            {/* Seznam Zpráv */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((msg) => {
                const isMe = msg.sender_id === currentUserId
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div
                      className={`max-w-[70%] md:max-w-[50%] p-3.5 rounded-2xl relative text-sm shadow-md ${
                        msg.message_type === 'vanish'
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 italic'
                          : isMe ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-100 rounded-bl-none'
                      }`}
                    >
                      {msg.content}

                      {/* Emoji reakce */}
                      {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                        <div className="absolute -bottom-2 right-2 flex gap-0.5 bg-slate-900 rounded-full px-1.5 py-0.5 border border-slate-700 text-[10px]">
                          {Object.values(msg.reactions).map((emoji, idx) => (
                            <span key={idx}>{emoji}</span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Rychlé reakce */}
                    <div className="flex gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity text-xs">
                      {['❤️', '😂', '🐾', '👍'].map((emoji) => (
                        <button key={emoji} onClick={() => addReaction(msg.id, emoji)} className="hover:scale-125 transition-transform">{emoji}</button>
                      ))}
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Vstup pro Zprávu */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center gap-3">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendMessage('text')}
                placeholder="Napište zprávu..."
                className="flex-1 bg-slate-800 text-white text-sm rounded-full px-5 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button onClick={() => sendMessage('vanish')} title="Mizející zpráva" className="p-2 text-xl hover:scale-110 transition-transform">🔥</button>
              <button onClick={() => sendMessage('text')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-full font-bold text-xs transition-colors">Odeslat</button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <span className="text-5xl mb-3">💬</span>
            <p className="text-sm">Vyberte konverzaci ze seznamu vlevo</p>
          </div>
        )}
      </div>

      {/* Overlay pro Video/Audio hovor */}
      {isCalling && currentUserId && activeUserId && (
        <VideoCallOverlay
          currentUserId={currentUserId}
          targetUserId={activeUserId}
          callType={callType}
          onClose={() => setIsCalling(false)}
        />
      )}
    </div>
  )
}