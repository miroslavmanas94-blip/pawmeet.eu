'use client'

import {
  Suspense,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

/* =========================
   IKONY
========================= */

function ArrowLeftIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M15 18l-6-6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle
        cx="11"
        cy="11"
        r="7"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M20 20l-4-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 3L10.5 13.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M21 3l-6.7 18-3.8-7.5L3 9.7 21 3z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="4"
        width="18"
        height="16"
        rx="2"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="8.5"
        cy="9"
        r="1.5"
        stroke="currentColor"
        strokeWidth="2"
      />
      <path
        d="M3 17l5-5 4 4 2.5-2.5L21 17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function StickerIcon() {
  return (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
      <path
        d="M8 15c1.2 1.5 2.5 2 4 2s2.8-.5 4-2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

/* =========================
   TYPY
========================= */

export type Profile = {
  id: string
  username: string
  avatar_url?: string | null
  last_seen?: string | null
}

export type Message = {
  id: string
  chat_id?: string | null
  sender_id: string
  receiver_id: string
  content: string
  media_url?: string | null
  sticker_url?: string | null
  created_at: string
}

export type Chat = {
  id: string
  created_at: string
  updated_at: string
  profile: Profile
  lastMessage?: Message | null
}

/* =========================
   SAMOLEPKY
========================= */

const stickerCategories = [
  {
    name: '🐶',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f436/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f431/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f43e/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f415/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f429/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f414/512.webp',
    ],
  },
  {
    name: '❤️',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/2764_fe0f/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f496/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f497/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f498/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f499/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f49a/512.webp',
    ],
  },
  {
    name: '😂',
    stickers: [
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f602/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f923/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f606/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f605/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f604/512.webp',
      'https://fonts.gstatic.com/s/e/notoemoji/latest/1f60d/512.webp',
    ],
  },
]

/* =========================
   POMOCNÉ FUNKCE
========================= */

function formatTime(date: string) {
  return new Date(date).toLocaleTimeString('cs-CZ', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatLastSeen(date?: string | null) {
  if (!date) return 'Offline'

  const d = new Date(date)
  const now = new Date()

  const diff = now.getTime() - d.getTime()

  if (diff < 60_000) return 'Právě online'

  if (diff < 60 * 60_000) {
    const minutes = Math.floor(diff / 60_000)
    return `před ${minutes} min`
  }

  if (diff < 24 * 60 * 60_000) {
    const hours = Math.floor(diff / (60 * 60_000))
    return `před ${hours} h`
  }

  return d.toLocaleDateString('cs-CZ')
}

/* =========================
   HLAVNÍ KOMPONENTA
========================= */

function ChatContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeUserId = searchParams.get('userId')

  const [currentUserId, setCurrentUserId] =
    useState<string | null>(null)

  const [contacts, setContacts] = useState<Profile[]>([])
  const [chats, setChats] = useState<Chat[]>([])

  const [activeProfile, setActiveProfile] =
    useState<Profile | null>(null)

  const [chatId, setChatId] =
    useState<string | null>(null)

  const [messages, setMessages] =
    useState<Message[]>([])

  const [newMessage, setNewMessage] =
    useState('')

  const [searchQuery, setSearchQuery] =
    useState('')

  const [loadingChats, setLoadingChats] =
    useState(true)

  const [loadingMessages, setLoadingMessages] =
    useState(false)

  const [onlineUsers, setOnlineUsers] =
    useState<Map<string, string>>(new Map())

  const [showAttachMenu, setShowAttachMenu] =
    useState(false)

  const [showStickerPicker, setShowStickerPicker] =
    useState(false)

  const [activeStickerTab, setActiveStickerTab] =
    useState(0)

  const [selectedMsgMenu, setSelectedMsgMenu] =
    useState<{
      msg: Message
      x: number
      y: number
    } | null>(null)

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  /* =========================
     SCROLL
  ========================= */

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
      })
    }, 50)
  }

  /* =========================
     NAČTENÍ PROFILŮ
  ========================= */

  const loadProfiles = async (userId: string) => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, last_seen')
      .neq('id', userId)
      .order('username', { ascending: true })

    if (error) {
      console.error('Chyba při načítání profilů:', error)
      return
    }

    setContacts(data || [])
  }

  /* =========================
     NAJDE EXISTUJÍCÍ CHAT
  ========================= */

  const findExistingChat = async (
    userId: string,
    otherUserId: string
  ): Promise<string | null> => {
    const supabase = createClient()

    const { data: myParticipants, error: myError } =
      await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId)

    if (myError) {
      console.error(myError)
      return null
    }

    const myChatIds =
      myParticipants?.map((item) => item.chat_id) || []

    if (myChatIds.length === 0) {
      return null
    }

    const { data: otherParticipant, error } =
      await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', otherUserId)
        .in('chat_id', myChatIds)
        .limit(1)

    if (error) {
      console.error(error)
      return null
    }

    return otherParticipant?.[0]?.chat_id || null
  }

  /* =========================
     VYTVOŘENÍ / ZÍSKÁNÍ CHATU
  ========================= */

  const getOrCreateChat = async (
    userId: string,
    otherUserId: string
  ): Promise<string | null> => {
    const supabase = createClient()

    const existingChat = await findExistingChat(
      userId,
      otherUserId
    )

    if (existingChat) {
      return existingChat
    }

    const { data: newChat, error: chatError } =
      await supabase
        .from('chats')
        .insert({
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single()

    if (chatError || !newChat) {
      console.error(
        'Chyba při vytváření chatu:',
        chatError
      )
      return null
    }

    const { error: participantError } =
      await supabase
        .from('chat_participants')
        .insert([
          {
            chat_id: newChat.id,
            user_id: userId,
          },
          {
            chat_id: newChat.id,
            user_id: otherUserId,
          },
        ])

    if (participantError) {
      console.error(
        'Chyba při přidávání účastníků:',
        participantError
      )

      await supabase
        .from('chats')
        .delete()
        .eq('id', newChat.id)

      return null
    }

    return newChat.id
  }

  /* =========================
     NAČTENÍ CHATŮ
  ========================= */

  const loadChats = async (userId: string) => {
    const supabase = createClient()

    setLoadingChats(true)

    try {
      const { data: myParticipants, error } =
        await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', userId)

      if (error) {
        console.error(
          'Chyba při načítání chatů:',
          error
        )
        setChats([])
        return
      }

      const chatIds =
        myParticipants?.map((x) => x.chat_id) || []

      if (chatIds.length === 0) {
        setChats([])
        return
      }

      const { data: participants } =
        await supabase
          .from('chat_participants')
          .select('chat_id, user_id')
          .in('chat_id', chatIds)
          .neq('user_id', userId)

      const otherUserIds =
        participants?.map((x) => x.user_id) || []

      if (otherUserIds.length === 0) {
        setChats([])
        return
      }

      const { data: profiles } =
        await supabase
          .from('profiles')
          .select(
            'id, username, avatar_url, last_seen'
          )
          .in('id', otherUserIds)

      const { data: chatRows } =
        await supabase
          .from('chats')
          .select(
            'id, created_at, updated_at'
          )
          .in('id', chatIds)

      const { data: lastMessages } =
        await supabase
          .from('messages')
          .select(
            'id, chat_id, sender_id, receiver_id, content, media_url, sticker_url, created_at'
          )
          .in('chat_id', chatIds)
          .order('created_at', {
            ascending: false,
          })

      const result: Chat[] = []

      for (const chat of chatRows || []) {
        const participant = participants?.find(
          (p) => p.chat_id === chat.id
        )

        if (!participant) continue

        const profile = profiles?.find(
          (p) => p.id === participant.user_id
        )

        if (!profile) continue

        const lastMessage =
          lastMessages?.find(
            (m) => m.chat_id === chat.id
          ) || null

        result.push({
          id: chat.id,
          created_at: chat.created_at,
          updated_at: chat.updated_at,
          profile,
          lastMessage,
        })
      }

      result.sort((a, b) => {
        const aDate =
          a.lastMessage?.created_at ||
          a.updated_at

        const bDate =
          b.lastMessage?.created_at ||
          b.updated_at

        return (
          new Date(bDate).getTime() -
          new Date(aDate).getTime()
        )
      })

      setChats(result)
    } finally {
      setLoadingChats(false)
    }
  }

  /* =========================
     INIT
  ========================= */

  useEffect(() => {
    let mounted = true

    const init = async () => {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      if (!mounted) return

      setCurrentUserId(user.id)

      await Promise.all([
        loadProfiles(user.id),
        loadChats(user.id),
      ])
    }

    init()

    return () => {
      mounted = false
    }
  }, [router])

  /* =========================
     PRESENCE
  ========================= */

  useEffect(() => {
    if (!currentUserId) return

    const supabase = createClient()

    const channel = supabase.channel(
      'online-presence',
      {
        config: {
          presence: {
            key: currentUserId,
          },
        },
      }
    )

    channel
      .on(
        'presence',
        {
          event: 'sync',
        },
        () => {
          const state = channel.presenceState()

          const users = new Map<string, string>()

          Object.entries(state).forEach(
            ([userId, values]) => {
              const first = values?.[0] as
                | {
                    online_at?: string
                  }
                | undefined

              users.set(
                userId,
                first?.online_at ||
                  new Date().toISOString()
              )
            }
          )

          setOnlineUsers(users)
        }
      )
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at:
              new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  /* =========================
     AKTIVNÍ CHAT
  ========================= */

  useEffect(() => {
    if (!currentUserId || !activeUserId) {
      setActiveProfile(null)
      setMessages([])
      setChatId(null)
      return
    }

    let cancelled = false

    const loadActiveChat = async () => {
      const supabase = createClient()

      setLoadingMessages(true)

      const { data: profile } =
        await supabase
          .from('profiles')
          .select(
            'id, username, avatar_url, last_seen'
          )
          .eq('id', activeUserId)
          .single()

      if (cancelled) return

      setActiveProfile(profile || null)

      const existingChat =
        await findExistingChat(
          currentUserId,
          activeUserId
        )

      if (cancelled) return

      setChatId(existingChat)

      let loadedMessages: Message[] = []

      if (existingChat) {
        const { data: chatMessages, error } =
          await supabase
            .from('messages')
            .select(
              'id, chat_id, sender_id, receiver_id, content, media_url, sticker_url, created_at'
            )
            .eq('chat_id', existingChat)
            .order('created_at', {
              ascending: true,
            })

        if (error) {
          console.error(error)
        }

        loadedMessages =
          (chatMessages as Message[]) || []

        /*
         * Načte i starší zprávy, které byly
         * vytvořené ještě před zavedením chat_id.
         */
        const { data: legacyMessages } =
          await supabase
            .from('messages')
            .select(
              'id, chat_id, sender_id, receiver_id, content, media_url, sticker_url, created_at'
            )
            .is('chat_id', null)
            .or(
              `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`
            )
            .order('created_at', {
              ascending: true,
            })

        loadedMessages = [
          ...loadedMessages,
          ...((legacyMessages as Message[]) ||
            []),
        ]
      } else {
        /*
         * Chat ještě neexistuje, ale pokud existují
         * starší zprávy bez chat_id, zobrazíme je.
         */
        const { data: legacyMessages } =
          await supabase
            .from('messages')
            .select(
              'id, chat_id, sender_id, receiver_id, content, media_url, sticker_url, created_at'
            )
            .is('chat_id', null)
            .or(
              `and(sender_id.eq.${currentUserId},receiver_id.eq.${activeUserId}),and(sender_id.eq.${activeUserId},receiver_id.eq.${currentUserId})`
            )
            .order('created_at', {
              ascending: true,
            })

        loadedMessages =
          (legacyMessages as Message[]) || []
      }

      const uniqueMessages = Array.from(
        new Map(
          loadedMessages.map((m) => [
            m.id,
            m,
          ])
        ).values()
      )

      uniqueMessages.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      )

      if (!cancelled) {
        setMessages(uniqueMessages)
        setLoadingMessages(false)

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({
            behavior: 'auto',
          })
        }, 100)
      }
    }

    loadActiveChat()

    return () => {
      cancelled = true
    }
  }, [currentUserId, activeUserId])

  /* =========================
     REALTIME ZPRÁVY
  ========================= */

  useEffect(() => {
    if (!currentUserId) return

    const supabase = createClient()

    const channel = supabase.channel(
      `chat_signal_${currentUserId}`
    )

    channel
      .on(
        'broadcast',
        {
          event: 'direct-message',
        },
        ({ payload }) => {
          const message =
            payload as Message

          if (!message?.id) return

          /*
           * Zpráva patří tomuto uživateli.
           */
          if (
            message.receiver_id !==
            currentUserId
          ) {
            return
          }

          setMessages((prev) => {
            if (
              prev.some(
                (m) => m.id === message.id
              )
            ) {
              return prev
            }

            return [...prev, message]
          })

          loadChats(currentUserId)

          if (
            message.sender_id ===
            activeUserId
          ) {
            scrollToBottom()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId, activeUserId])

  /* =========================
     OTEVŘENÍ CHATU
  ========================= */

  const openChat = (userId: string) => {
    setSearchQuery('')
    router.push(`/chat?userId=${userId}`)
  }

  /* =========================
     ODESLÁNÍ
  ========================= */

  const sendPayload = async (payload: {
    content?: string
    media_url?: string | null
    sticker_url?: string | null
  }) => {
    if (
      !currentUserId ||
      !activeUserId
    ) {
      return
    }

    const content =
      payload.content?.trim() || ''

    if (
      !content &&
      !payload.media_url &&
      !payload.sticker_url
    ) {
      return
    }

    const supabase = createClient()

    /*
     * Pokud chat ještě neexistuje,
     * automaticky ho vytvoříme.
     */
    let currentChatId = chatId

    if (!currentChatId) {
      currentChatId =
        await getOrCreateChat(
          currentUserId,
          activeUserId
        )

      if (!currentChatId) {
        alert(
          'Nepodařilo se vytvořit chat.'
        )
        return
      }

      setChatId(currentChatId)
    }

    const fullPayload = {
      chat_id: currentChatId,
      sender_id: currentUserId,
      receiver_id: activeUserId,
      content,
      media_url:
        payload.media_url || null,
      sticker_url:
        payload.sticker_url || null,
      created_at:
        new Date().toISOString(),
    }

    const { data: savedMessage, error } =
      await supabase
        .from('messages')
        .insert(fullPayload)
        .select(
          'id, chat_id, sender_id, receiver_id, content, media_url, sticker_url, created_at'
        )
        .single()

    if (error || !savedMessage) {
      console.error(
        'Chyba při ukládání zprávy:',
        error
      )

      alert(
        'Zprávu se nepodařilo uložit.'
      )

      return
    }

    /*
     * Aktualizace času chatu.
     */
    await supabase
      .from('chats')
      .update({
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', currentChatId)

    const message =
      savedMessage as Message

    /*
     * Přidáme zprávu okamžitě u odesílatele.
     */
    setMessages((prev) => {
      if (
        prev.some(
          (m) => m.id === message.id
        )
      ) {
        return prev
      }

      return [...prev, message]
    })

    /*
     * Pošleme ji druhému uživateli přes realtime.
     */
    await supabase
      .channel(
        `chat_signal_${activeUserId}`
      )
      .send({
        type: 'broadcast',
        event: 'direct-message',
        payload: message,
      })

    setNewMessage('')

    setShowAttachMenu(false)
    setShowStickerPicker(false)

    await loadChats(currentUserId)

    scrollToBottom()
  }

  /* =========================
     TEXT
  ========================= */

  const handleSend = async () => {
    await sendPayload({
      content: newMessage,
    })
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  /* =========================
     OBRÁZEK
  ========================= */

  const handleImageSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert(
        'Vyber prosím obrázek.'
      )
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      alert(
        'Obrázek může mít maximálně 8 MB.'
      )
      return
    }

    const reader = new FileReader()

    reader.onload = async () => {
      const result =
        reader.result?.toString()

      if (!result) return

      await sendPayload({
        media_url: result,
      })
    }

    reader.readAsDataURL(file)

    e.target.value = ''
  }

  /* =========================
     SAMOLEPKA
  ========================= */

  const sendSticker = async (
    stickerUrl: string
  ) => {
    await sendPayload({
      sticker_url: stickerUrl,
    })
  }

  /* =========================
     SMAZÁNÍ ZPRÁVY
  ========================= */

  const deleteMessage = async (
    message: Message
  ) => {
    if (!currentUserId) return

    if (
      message.sender_id !==
      currentUserId
    ) {
      setSelectedMsgMenu(null)
      return
    }

    const supabase = createClient()

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', message.id)
      .eq(
        'sender_id',
        currentUserId
      )

    if (error) {
      console.error(
        'Chyba při mazání:',
        error
      )
      return
    }

    setMessages((prev) =>
      prev.filter(
        (m) => m.id !== message.id
      )
    )

    setSelectedMsgMenu(null)

    await loadChats(currentUserId)
  }

  /* =========================
     VYHLEDÁVÁNÍ
  ========================= */

  const filteredChats = chats.filter(
    (chat) =>
      chat.profile.username
        ?.toLowerCase()
        .includes(
          searchQuery.toLowerCase()
        )
  )

  const filteredContacts =
    contacts.filter(
      (profile) =>
        profile.username
          ?.toLowerCase()
          .includes(
            searchQuery.toLowerCase()
          )
    )

  const isSearching =
    searchQuery.trim().length > 0

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="fixed inset-0 bg-white text-gray-900 overflow-hidden">
      <div className="flex h-full w-full">
        {/* =====================
            LEVÝ PANEL
        ===================== */}

        <aside
          className={`
            w-full md:w-[360px]
            border-r border-gray-200
            bg-white
            flex flex-col
            ${
              activeUserId
                ? 'hidden md:flex'
                : 'flex'
            }
          `}
        >
          {/* HEADER */}

          <div className="px-4 pt-5 pb-3">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-2xl font-bold">
                Chat
              </h1>
            </div>

            <div className="relative">
              <SearchIcon />

              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                <SearchIcon />
              </div>

              <input
                value={searchQuery}
                onChange={(e) =>
                  setSearchQuery(
                    e.target.value
                  )
                }
                placeholder="Hledat uživatele..."
                className="w-full h-11 rounded-2xl bg-gray-100 pl-10 pr-4 outline-none focus:ring-2 focus:ring-black/10"
              />
            </div>
          </div>

          {/* SEZNAM */}

          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {loadingChats &&
            !isSearching ? (
              <div className="px-4 py-8 text-center text-gray-400">
                Načítám chaty...
              </div>
            ) : isSearching ? (
              <>
                {filteredContacts.length ===
                0 ? (
                  <div className="px-4 py-8 text-center text-gray-400">
                    Uživatel nenalezen
                  </div>
                ) : (
                  <>
                    <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Uživatelé
                    </div>

                    {filteredContacts.map(
                      (profile) => {
                        const isOnline =
                          onlineUsers.has(
                            profile.id
                          )

                        return (
                          <button
                            key={profile.id}
                            onClick={() =>
                              openChat(
                                profile.id
                              )
                            }
                            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-100 transition text-left"
                          >
                            <div className="relative shrink-0">
                              <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200">
                                {profile.avatar_url ? (
                                  <img
                                    src={
                                      profile.avatar_url
                                    }
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
                                    {profile.username
                                      ?.charAt(
                                        0
                                      )
                                      ?.toUpperCase()}
                                  </div>
                                )}
                              </div>

                              {isOnline && (
                                <span className="absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="font-semibold truncate">
                                {
                                  profile.username
                                }
                              </div>

                              <div className="text-sm text-gray-400">
                                {isOnline
                                  ? 'Online'
                                  : formatLastSeen(
                                      profile.last_seen
                                    )}
                              </div>
                            </div>
                          </button>
                        )
                      }
                    )}
                  </>
                )}
              </>
            ) : filteredChats.length ===
              0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-5xl mb-4">
                  💬
                </div>

                <div className="font-semibold text-gray-700 mb-1">
                  Zatím žádné chaty
                </div>

                <div className="text-sm text-gray-400">
                  Vyhledej uživatele nahoře a
                  začni konverzaci.
                </div>
              </div>
            ) : (
              <>
                {filteredChats.map((chat) => {
                  const profile =
                    chat.profile

                  const isOnline =
                    onlineUsers.has(
                      profile.id
                    )

                  const isActive =
                    activeUserId ===
                    profile.id

                  let preview =
                    'Začněte konverzaci'

                  if (
                    chat.lastMessage
                  ) {
                    if (
                      chat.lastMessage
                        .sticker_url
                    ) {
                      preview =
                        'Samolepka'
                    } else if (
                      chat.lastMessage
                        .media_url
                    ) {
                      preview =
                        '📷 Obrázek'
                    } else {
                      preview =
                        chat.lastMessage
                          .content ||
                        'Zpráva'
                    }
                  }

                  return (
                    <button
                      key={chat.id}
                      onClick={() =>
                        openChat(
                          profile.id
                        )
                      }
                      className={`
                        w-full flex items-center gap-3 p-3 rounded-2xl transition text-left
                        ${
                          isActive
                            ? 'bg-gray-100'
                            : 'hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-200">
                          {profile.avatar_url ? (
                            <img
                              src={
                                profile.avatar_url
                              }
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-lg font-bold text-gray-500">
                              {profile.username
                                ?.charAt(
                                  0
                                )
                                ?.toUpperCase()}
                            </div>
                          )}
                        </div>

                        {isOnline && (
                          <span className="absolute right-0 bottom-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold truncate">
                            {
                              profile.username
                            }
                          </span>

                          {chat.lastMessage && (
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {formatTime(
                                chat
                                  .lastMessage
                                  .created_at
                              )}
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-gray-400 truncate mt-0.5">
                          {preview}
                        </div>
                      </div>
                    </button>
                  )
                })}
              </>
            )}
          </div>
        </aside>

        {/* =====================
            PRAVÝ PANEL
        ===================== */}

        <section
          className={`
            flex-1 min-w-0
            flex flex-col
            bg-white
            ${
              activeUserId
                ? 'flex'
                : 'hidden md:flex'
            }
          `}
        >
          {!activeUserId ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">
                  💬
                </div>
                <div className="font-semibold text-gray-600">
                  Vyber chat
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* CHAT HEADER */}

              <header className="h-[72px] border-b border-gray-200 flex items-center gap-3 px-4 shrink-0">
                <button
                  onClick={() =>
                    router.push('/chat')
                  }
                  className="md:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <ArrowLeftIcon />
                </button>

                <button
                  onClick={() =>
                    activeProfile &&
                    router.push(
                      `/profil/${activeProfile.username}`
                    )
                  }
                  className="flex items-center gap-3 min-w-0 text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-gray-200">
                      {activeProfile?.avatar_url ? (
                        <img
                          src={
                            activeProfile.avatar_url
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-500">
                          {activeProfile?.username
                            ?.charAt(0)
                            ?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    {onlineUsers.has(
                      activeUserId
                    ) && (
                      <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-green-500 border-2 border-white" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="font-bold truncate">
                      {activeProfile?.username ||
                        'Načítám...'}
                    </div>

                    <div className="text-xs text-gray-400">
                      {onlineUsers.has(
                        activeUserId
                      )
                        ? 'Online'
                        : formatLastSeen(
                            activeProfile?.last_seen
                          )}
                    </div>
                  </div>
                </button>
              </header>

              {/* ZPRÁVY */}

              <div
                className="flex-1 overflow-y-auto px-3 md:px-6 py-5"
                onClick={() =>
                  setSelectedMsgMenu(null)
                }
              >
                {loadingMessages ? (
                  <div className="h-full flex items-center justify-center text-gray-400">
                    Načítám zprávy...
                  </div>
                ) : messages.length ===
                  0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-400">
                      <div className="text-5xl mb-3">
                        👋
                      </div>
                      <div className="font-semibold text-gray-600">
                        Začni konverzaci
                      </div>
                      <div className="text-sm mt-1">
                        Pošli první zprávu
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto space-y-2">
                    {messages.map(
                      (message) => {
                        const own =
                          message.sender_id ===
                          currentUserId

                        return (
                          <div
                            key={message.id}
                            className={`flex ${
                              own
                                ? 'justify-end'
                                : 'justify-start'
                            }`}
                          >
                            <div
                              className="max-w-[78%] md:max-w-[65%]"
                              onContextMenu={(
                                e
                              ) => {
                                e.preventDefault()

                                setSelectedMsgMenu(
                                  {
                                    msg: message,
                                    x: e.clientX,
                                    y: e.clientY,
                                  }
                                )
                              }}
                              onDoubleClick={(
                                e
                              ) => {
                                setSelectedMsgMenu(
                                  {
                                    msg: message,
                                    x: e.clientX,
                                    y: e.clientY,
                                  }
                                )
                              }}
                            >
                              <div
                                className={`
                                  rounded-2xl overflow-hidden
                                  ${
                                    own
                                      ? 'bg-black text-white rounded-br-md'
                                      : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                  }
                                `}
                              >
                                {message.media_url && (
                                  <img
                                    src={
                                      message.media_url
                                    }
                                    alt="Obrázek"
                                    className="max-w-full max-h-[350px] object-cover"
                                  />
                                )}

                                {message.sticker_url && (
                                  <div className="p-2">
                                    <img
                                      src={
                                        message.sticker_url
                                      }
                                      alt="Samolepka"
                                      className="w-28 h-28 object-contain"
                                    />
                                  </div>
                                )}

                                {message.content && (
                                  <div className="px-4 py-2.5 whitespace-pre-wrap break-words">
                                    {
                                      message.content
                                    }
                                  </div>
                                )}
                              </div>

                              <div
                                className={`text-[10px] text-gray-400 mt-1 ${
                                  own
                                    ? 'text-right'
                                    : 'text-left'
                                }`}
                              >
                                {formatTime(
                                  message.created_at
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      }
                    )}

                    <div
                      ref={messagesEndRef}
                    />
                  </div>
                )}
              </div>

              {/* =====================
                  STICKER PICKER
              ===================== */}

              {showStickerPicker && (
                <div className="border-t border-gray-200 bg-white px-3 pt-3">
                  <div className="flex gap-2 mb-3">
                    {stickerCategories.map(
                      (
                        category,
                        index
                      ) => (
                        <button
                          key={
                            category.name
                          }
                          onClick={() =>
                            setActiveStickerTab(
                              index
                            )
                          }
                          className={`
                            w-10 h-10 rounded-xl
                            ${
                              activeStickerTab ===
                              index
                                ? 'bg-gray-200'
                                : 'hover:bg-gray-100'
                            }
                          `}
                        >
                          {
                            category.name
                          }
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-3">
                    {stickerCategories[
                      activeStickerTab
                    ].stickers.map(
                      (sticker) => (
                        <button
                          key={sticker}
                          onClick={() =>
                            sendSticker(
                              sticker
                            )
                          }
                          className="w-16 h-16 rounded-xl hover:bg-gray-100 shrink-0 flex items-center justify-center"
                        >
                          <img
                            src={sticker}
                            alt=""
                            className="w-12 h-12 object-contain"
                          />
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* =====================
                  ATTACH MENU
              ===================== */}

              {showAttachMenu && (
                <div className="border-t border-gray-200 bg-white px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200"
                    >
                      <ImageIcon />
                      <span>
                        Obrázek
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setShowAttachMenu(
                          false
                        )
                        setShowStickerPicker(
                          true
                        )
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200"
                    >
                      <StickerIcon />
                      <span>
                        Samolepka
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* =====================
                  INPUT
              ===================== */}

              <div className="border-t border-gray-200 p-3 md:p-4 shrink-0">
                <div className="max-w-3xl mx-auto flex items-end gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={
                      handleImageSelect
                    }
                    className="hidden"
                  />

                  <button
                    onClick={() => {
                      setShowAttachMenu(
                        (v) => !v
                      )
                      setShowStickerPicker(
                        false
                      )
                    }}
                    className="w-11 h-11 rounded-full hover:bg-gray-100 flex items-center justify-center shrink-0"
                  >
                    <PlusIcon />
                  </button>

                  <button
                    onClick={() => {
                      setShowStickerPicker(
                        (v) => !v
                      )
                      setShowAttachMenu(
                        false
                      )
                    }}
                    className={`
                      w-11 h-11 rounded-full flex items-center justify-center shrink-0
                      ${
                        showStickerPicker
                          ? 'bg-gray-200'
                          : 'hover:bg-gray-100'
                      }
                    `}
                  >
                    <StickerIcon />
                  </button>

                  <div className="flex-1 relative">
                    <input
                      value={newMessage}
                      onChange={(e) =>
                        setNewMessage(
                          e.target.value
                        )
                      }
                      onKeyDown={
                        handleKeyDown
                      }
                      placeholder="Napiš zprávu..."
                      className="w-full h-11 rounded-full bg-gray-100 px-4 pr-12 outline-none focus:ring-2 focus:ring-black/10"
                    />

                    <button
                      onClick={
                        handleSend
                      }
                      disabled={
                        !newMessage.trim()
                      }
                      className="absolute right-1 top-1 w-9 h-9 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <SendIcon />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* =====================
          MENU ZPRÁVY
      ===================== */}

      {selectedMsgMenu && (
        <div
          className="fixed z-[100] bg-white rounded-xl shadow-xl border border-gray-200 py-1 min-w-[150px]"
          style={{
            left: Math.min(
              selectedMsgMenu.x,
              window.innerWidth - 170
            ),
            top: Math.min(
              selectedMsgMenu.y,
              window.innerHeight - 70
            ),
          }}
          onClick={(e) =>
            e.stopPropagation()
          }
        >
          {selectedMsgMenu.msg.sender_id ===
            currentUserId && (
            <button
              onClick={() =>
                deleteMessage(
                  selectedMsgMenu.msg
                )
              }
              className="w-full text-left px-4 py-2.5 text-red-500 hover:bg-red-50"
            >
              Smazat zprávu
            </button>
          )}

          <button
            onClick={() =>
              setSelectedMsgMenu(null)
            }
            className="w-full text-left px-4 py-2.5 hover:bg-gray-100"
          >
            Zrušit
          </button>
        </div>
      )}
    </main>
  )
}

/* =========================
   EXPORT
========================= */

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="fixed inset-0 flex items-center justify-center bg-white text-gray-400">
          Načítám chat...
        </div>
      }
    >
      <ChatContent />
    </Suspense>
  )
}