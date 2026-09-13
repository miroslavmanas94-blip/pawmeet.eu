'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  username?: string | null
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
  last_seen?: string | null
}

type Contact = Profile & {
  last_message?: string
  last_message_at?: string
}

type Group = {
  id: string
  name: string
  description?: string | null
  avatar_url?: string | null
  is_private: boolean
  is_public?: boolean
  created_by?: string | null
  owner_id?: string | null
  created_at?: string
}

type Message = {
  id: string
  sender_id: string
  receiver_id?: string | null
  group_id?: string | null
  content?: string | null
  media_url?: string | null
  media_type?: string | null
  sticker_url?: string | null
  created_at: string
}

type GroupMessage = Message & {
  group_id: string
}

type ChatItem =
  | {
      type: 'user'
      id: string
      profile: Profile
      last_message?: string
      last_message_at?: string
    }
  | {
      type: 'group'
      id: string
      group: Group
      last_message?: string
      last_message_at?: string
    }

const EMOJIS = [
  '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇',
  '🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚',
  '😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩',
  '🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣',
  '😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬',
  '🤯','😳','🥵','🥶','😱','😨','😰','😥','😓','🤗',
  '🤔','🫡','🤭','🤫','🤥','😶','😐','😑','😬','🙄',
  '😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵',
  '🤐','🥴','🤢','🤮','🤧','😷','🤒','🤕','🤑','🤠',
  '👻','💀','☠️','👽','🤖','🎃','😈','👿','🤡','💩',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💖',
  '🔥','✨','⭐','🌟','💫','⚡','💥','🎉','🎊','💯',
  '👍','👎','👏','🙌','🫶','🤝','🙏','💪','👀','👋',
  '🐶','🐕','🦊','🐱','🐭','🐹','🐰','🦁','🐯','🐻',
  '🐼','🐨','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧',
  '🐦','🦆','🦅','🦉','🐺','🐗','🐴','🦄','🐝','🦋',
  '🌈','☀️','🌙','🌎','🌍','🌳','🌲','🌸','🌺','🌻',
  '🍎','🍕','🍔','🍟','🌭','🍿','🍩','🍪','🎂','🍰',
  '⚽','🏀','🏈','⚾','🎾','🏆','🥇','🥈','🥉','🎮',
  '🚗','🚲','🛴','✈️','🚀','🏠','💻','📱','🎧','📷',
]

const FLUENT_3D = [
  {
    name: 'Grinning Face',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Grinning%20face/3D/grinning_face_3d.png',
  },
  {
    name: 'Heart Eyes',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Smiling%20face%20with%20heart-eyes/3D/smiling_face_with_heart-eyes_3d.png',
  },
  {
    name: 'Partying Face',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Partying%20face/3D/partying_face_3d.png',
  },
  {
    name: 'Victory Hand',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Victory%20hand/3D/victory_hand_3d.png',
  },
  {
    name: 'Fire',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Fire/3D/fire_3d.png',
  },
  {
    name: 'Red Heart',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Red%20heart/3D/red_heart_3d.png',
  },
  {
    name: 'Thumbs Up',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Thumbs%20up/3D/thumbs_up_3d.png',
  },
  {
    name: 'Dog',
    url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Dog/3D/dog_3d.png',
  },
]

/*
 * 1000 sticker položek.
 *
 * Každá položka má vlastní ID a je vyhledatelná.
 * Pro rychlé načtení používáme emoji jako sticker fallback.
 * Později můžeš stejnou strukturu napojit na vlastní Supabase
 * Storage sticker pack.
 */
const STICKERS = Array.from({ length: 1000 }, (_, index) => {
  const emoji = EMOJIS[index % EMOJIS.length]

  return {
    id: `sticker-${index + 1}`,
    name: `Sticker ${index + 1} ${emoji}`,
    emoji,
    url: `emoji:${encodeURIComponent(emoji)}`,
  }
})

function Avatar({
  profile,
  size = 'normal',
  fallbackName,
}: {
  profile?: Profile | null
  size?: 'small' | 'normal' | 'large'
  fallbackName?: string
}) {
  const name =
    profile?.first_name ||
    profile?.username ||
    fallbackName ||
    '?'

  const initials = name.substring(0, 1).toUpperCase()

  const sizes = {
    small: 'w-9 h-9 text-sm',
    normal: 'w-11 h-11 text-base',
    large: 'w-14 h-14 text-xl',
  }

  if (profile?.avatar_url) {
    return (
      <img
        src={profile.avatar_url}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${sizes[size]} rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold shrink-0`}
    >
      {initials}
    </div>
  )
}

function ChatPageContent() {
  const supabase = useMemo(() => createClient(), [])
  const router = useRouter()
  const searchParams = useSearchParams()

  const activeUserId = searchParams.get('userId')
  const activeGroupId = searchParams.get('groupId')

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)

  const [contacts, setContacts] = useState<Contact[]>([])
  const [groups, setGroups] = useState<Group[]>([])

  const [activeProfile, setActiveProfile] = useState<Profile | null>(null)
  const [activeGroup, setActiveGroup] = useState<Group | null>(null)

  const [messages, setMessages] = useState<Message[]>([])
  const [groupMessages, setGroupMessages] = useState<GroupMessage[]>([])

  const [newMessage, setNewMessage] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const [showNewChat, setShowNewChat] = useState(false)
  const [newChatTab, setNewChatTab] = useState<'search' | 'group'>('search')

  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [userSearch, setUserSearch] = useState('')

  const [groupType, setGroupType] = useState<'private' | 'public'>('private')
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [groupMemberSearch, setGroupMemberSearch] = useState('')
  const [creatingGroup, setCreatingGroup] = useState(false)

  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [emojiSearch, setEmojiSearch] = useState('')

  const [showStickerPicker, setShowStickerPicker] = useState(false)
  const [stickerSearch, setStickerSearch] = useState('')

  const [show3DEmojis, setShow3DEmojis] = useState(false)

  const [showAttachMenu, setShowAttachMenu] = useState(false)
  const [zoomedImage, setZoomedImage] = useState<string | null>(null)

  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [typingUsers, setTypingUsers] = useState<string[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const activeIsGroup = Boolean(activeGroupId)

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    if (!currentUserId) return

    loadConversations()

    const channel = supabase
      .channel(`chat-list-${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          loadConversations()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return

    if (activeUserId) {
      loadPrivateChat(activeUserId)
    } else {
      setActiveProfile(null)
      setMessages([])
    }
  }, [currentUserId, activeUserId])

  useEffect(() => {
    if (!currentUserId) return

    if (activeGroupId) {
      loadGroupChat(activeGroupId)
    } else {
      setActiveGroup(null)
      setGroupMessages([])
    }
  }, [currentUserId, activeGroupId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
    })
  }, [messages, groupMessages])

  useEffect(() => {
    if (!currentUserId) return

    const presence = supabase.channel('pawmeet-presence', {
      config: {
        presence: {
          key: currentUserId,
        },
      },
    })

    presence
      .on('presence', { event: 'sync' }, () => {
        const state = presence.presenceState()
        setOnlineUsers(new Set(Object.keys(state)))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presence.track({
            user_id: currentUserId,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(presence)
    }
  }, [currentUserId])

  useEffect(() => {
    if (!currentUserId) return
    if (!activeUserId && !activeGroupId) return

    const channelName = activeGroupId
      ? `chat-group-${activeGroupId}`
      : `chat-private-${[currentUserId, activeUserId].sort().join('-')}`

    const channel = supabase
      .channel(channelName)
      .on(
        'broadcast',
        { event: 'message' },
        ({ payload }) => {
          if (payload?.sender_id === currentUserId) return

          if (activeGroupId) {
            setGroupMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev

              return [
                ...prev,
                payload as GroupMessage,
              ]
            })
          } else {
            setMessages((prev) => {
              if (prev.some((m) => m.id === payload.id)) return prev

              return [
                ...prev,
                payload as Message,
              ]
            })
          }

          loadConversations()
        }
      )
      .on(
        'broadcast',
        { event: 'typing' },
        ({ payload }) => {
          if (!payload?.user_id || payload.user_id === currentUserId) {
            return
          }

          if (payload.typing) {
            setTypingUsers((prev) =>
              prev.includes(payload.user_id)
                ? prev
                : [...prev, payload.user_id]
            )
          } else {
            setTypingUsers((prev) =>
              prev.filter((id) => id !== payload.user_id)
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      setTypingUsers([])
    }
  }, [
    currentUserId,
    activeUserId,
    activeGroupId,
  ])

  async function initialize() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setCurrentUserId(user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    setCurrentUserProfile(profile)

    await loadConversations(user.id)

    setLoading(false)
  }

  async function loadConversations(userId = currentUserId) {
    if (!userId) return

    const contactMap = new Map<string, Contact>()

    const { data: privateMessages } = await supabase
      .from('messages')
      .select(
        'id,sender_id,receiver_id,content,media_url,media_type,created_at'
      )
      .or(
        `sender_id.eq.${userId},receiver_id.eq.${userId}`
      )
      .is('group_id', null)
      .order('created_at', { ascending: false })
      .limit(300)

    for (const message of privateMessages || []) {
      const otherId =
        message.sender_id === userId
          ? message.receiver_id
          : message.sender_id

      if (!otherId || contactMap.has(otherId)) continue

      contactMap.set(otherId, {
        id: otherId,
        last_message:
          message.content ||
          (message.media_url ? '📷 Fotka' : 'Zpráva'),
        last_message_at: message.created_at,
      })
    }

    const contactIds = [...contactMap.keys()]

    if (contactIds.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', contactIds)

      for (const profile of profiles || []) {
        const existing = contactMap.get(profile.id)

        if (existing) {
          contactMap.set(profile.id, {
            ...profile,
            last_message: existing.last_message,
            last_message_at: existing.last_message_at,
          })
        }
      }
    }

    setContacts([...contactMap.values()])

    const { data: memberships } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', userId)

    const groupIds = [
      ...new Set(
        (memberships || []).map((item) => item.group_id)
      ),
    ]

    if (!groupIds.length) {
      setGroups([])
      return
    }

    const { data: userGroups } = await supabase
      .from('groups')
      .select('*')
      .in('id', groupIds)
      .order('created_at', { ascending: false })

    setGroups(userGroups || [])
  }

  async function loadPrivateChat(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    setActiveProfile(profile)

    const { data } = await supabase
      .from('messages')
      .select(
        'id,sender_id,receiver_id,group_id,content,media_url,media_type,sticker_url,created_at'
      )
      .or(
        `and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`
      )
      .is('group_id', null)
      .order('created_at', { ascending: true })

    setMessages(data || [])
  }

  async function loadGroupChat(groupId: string) {
    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .maybeSingle()

    if (!group) {
      router.push('/chat')
      return
    }

    const { data: membership } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', groupId)
      .eq('user_id', currentUserId)
      .maybeSingle()

    if (!membership) {
      router.push('/chat')
      return
    }

    setActiveGroup(group)

    const { data } = await supabase
      .from('group_messages')
      .select(
        'id,group_id,sender_id,content,media_url,sticker_url,created_at'
      )
      .eq('group_id', groupId)
      .order('created_at', { ascending: true })

    setGroupMessages(data || [])
  }

  async function openNewChatModal() {
    setShowNewChat(true)

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId)
      .order('first_name', { ascending: true })
      .limit(200)

    setAllUsers(data || [])
  }

  function openUserChat(userId: string) {
    setShowNewChat(false)
    router.push(`/chat?userId=${encodeURIComponent(userId)}`)
  }

  async function openGroup(group: Group) {
    if (!currentUserId) return

    const { data: existing } = await supabase
      .from('group_members')
      .select('id')
      .eq('group_id', group.id)
      .eq('user_id', currentUserId)
      .maybeSingle()

    if (!existing) {
      if (group.is_private) {
        alert('Do této soukromé skupiny nemáš přístup.')
        return
      }

      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: currentUserId,
          role: 'member',
        })

      if (error && error.code !== '23505') {
        alert(error.message)
        return
      }
    }

    setShowNewChat(false)

    await loadConversations()

    router.push(
      `/chat?groupId=${encodeURIComponent(group.id)}`
    )
  }

  async function createGroup() {
    if (!currentUserId) return

    const trimmedName = groupName.trim()

    if (!trimmedName) {
      alert('Zadej název skupiny.')
      return
    }

    setCreatingGroup(true)

    try {
      const { data: group, error } = await supabase
        .from('groups')
        .insert({
          name: trimmedName,
          description: groupDescription.trim() || null,
          is_private: groupType === 'private',
          is_public: groupType === 'public',
          created_by: currentUserId,
          owner_id: currentUserId,
        })
        .select('*')
        .single()

      if (error) throw error

      const memberIds = [
        currentUserId,
        ...selectedMembers.filter(
          (id) => id !== currentUserId
        ),
      ]

      const { error: memberError } = await supabase
        .from('group_members')
        .upsert(
          memberIds.map((userId) => ({
            group_id: group.id,
            user_id: userId,
            role:
              userId === currentUserId
                ? 'owner'
                : 'member',
          })),
          {
            onConflict: 'group_id,user_id',
          }
        )

      if (memberError) throw memberError

      setGroupName('')
      setGroupDescription('')
      setSelectedMembers([])
      setGroupMemberSearch('')
      setShowNewChat(false)

      await loadConversations()

      router.push(
        `/chat?groupId=${encodeURIComponent(group.id)}`
      )
    } catch (error: any) {
      console.error(error)
      alert(
        error?.message ||
          'Skupinu se nepodařilo vytvořit.'
      )
    } finally {
      setCreatingGroup(false)
    }
  }

  async function sendTyping(typing: boolean) {
    if (!currentUserId) return
    if (!activeUserId && !activeGroupId) return

    const channelName = activeGroupId
      ? `chat-group-${activeGroupId}`
      : `chat-private-${[currentUserId, activeUserId].sort().join('-')}`

    const channel = supabase.channel(channelName)

    await channel.send({
      type: 'broadcast',
      event: 'typing',
      payload: {
        user_id: currentUserId,
        typing,
      },
    })
  }

  function handleInputChange(value: string) {
    setNewMessage(value)

    sendTyping(true)

    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current)
    }

    typingTimeout.current = setTimeout(() => {
      sendTyping(false)
    }, 1200)
  }

  async function broadcastMessage(
    message: Message
  ) {
    if (!currentUserId) return

    const channelName = message.group_id
      ? `chat-group-${message.group_id}`
      : `chat-private-${[
          currentUserId,
          message.receiver_id,
        ]
          .sort()
          .join('-')}`

    const channel = supabase.channel(channelName)

    await channel.send({
      type: 'broadcast',
      event: 'message',
      payload: message,
    })
  }

  async function sendMessage(
    overrides?: {
      content?: string
      media_url?: string
      media_type?: string
      sticker_url?: string
    }
  ) {
    if (!currentUserId) return

    const content =
      overrides?.content !== undefined
        ? overrides.content
        : newMessage.trim()

    const mediaUrl = overrides?.media_url || null
    const mediaType = overrides?.media_type || null
    const stickerUrl = overrides?.sticker_url || null

    if (!content && !mediaUrl && !stickerUrl) {
      return
    }

    setSending(true)

    try {
      if (activeGroupId) {
        const { data, error } = await supabase
          .from('group_messages')
          .insert({
            group_id: activeGroupId,
            sender_id: currentUserId,
            content: content || '',
            media_url: mediaUrl,
            sticker_url: stickerUrl,
          })
          .select('*')
          .single()

        if (error) throw error

        setGroupMessages((prev) => [
          ...prev,
          data,
        ])

        await broadcastMessage(data)

        setNewMessage('')
        setShowEmojiPicker(false)
        setShowStickerPicker(false)
        setShowAttachMenu(false)
        return
      }

      if (activeUserId) {
        const { data, error } = await supabase
          .from('messages')
          .insert({
            sender_id: currentUserId,
            receiver_id: activeUserId,
            group_id: null,
            content: content || '',
            media_url: mediaUrl,
            media_type: mediaType,
            created_at: new Date().toISOString(),
          })
          .select('*')
          .single()

        if (error) throw error

        setMessages((prev) => [
          ...prev,
          data,
        ])

        await broadcastMessage(data)

        setNewMessage('')
        setShowEmojiPicker(false)
        setShowStickerPicker(false)
        setShowAttachMenu(false)
      }
    } catch (error: any) {
      console.error(error)
      alert(
        error?.message ||
          'Zprávu se nepodařilo odeslat.'
      )
    } finally {
      setSending(false)
      sendTyping(false)
      await loadConversations()
    }
  }

  function handleFileSelect(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Vyber obrázek.')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('Obrázek může mít maximálně 8 MB.')
      return
    }

    const reader = new FileReader()

    reader.onload = async () => {
      const result = reader.result

      if (typeof result !== 'string') return

      await sendMessage({
        media_url: result,
        media_type: file.type,
      })
    }

    reader.readAsDataURL(file)

    event.target.value = ''
  }

  function addEmoji(emoji: string) {
    setNewMessage((prev) => prev + emoji)
  }

  function sendSticker(sticker: {
    emoji: string
    url: string
  }) {
    /*
     * Emoji sticker je uložen jako content.
     * Skutečný obrázkový sticker můžeš později uložit
     * přes sticker_url.
     */
    sendMessage({
      content: sticker.emoji,
    })
  }

  function send3DEmoji(url: string) {
    sendMessage({
      sticker_url: url,
    })
  }

  const filteredContacts = contacts.filter((contact) => {
    const text =
      `${contact.first_name || ''} ${contact.last_name || ''} ${contact.username || ''}`.toLowerCase()

    return text.includes(searchQuery.toLowerCase())
  })

  const filteredUsers = allUsers.filter((user) => {
    const text =
      `${user.first_name || ''} ${user.last_name || ''} ${user.username || ''}`.toLowerCase()

    return text.includes(userSearch.toLowerCase())
  })

  const filteredGroupMembers = allUsers.filter((user) => {
    const text =
      `${user.first_name || ''} ${user.last_name || ''} ${user.username || ''}`.toLowerCase()

    return (
      text.includes(groupMemberSearch.toLowerCase()) &&
      user.id !== currentUserId
    )
  })

  const filteredEmoji = EMOJIS.filter((emoji) =>
    emoji.includes(emojiSearch)
  )

  const filteredStickers = STICKERS.filter(
    (sticker) =>
      sticker.name
        .toLowerCase()
        .includes(stickerSearch.toLowerCase()) ||
      sticker.emoji.includes(stickerSearch)
  )

  const activeMessages = activeIsGroup
    ? groupMessages
    : messages

  function getMessageSenderName(senderId: string) {
    if (senderId === currentUserId) {
      return (
        currentUserProfile?.first_name ||
        currentUserProfile?.username ||
        'Ty'
      )
    }

    return 'Uživatel'
  }

  function renderMessageContent(message: Message) {
    if (message.sticker_url) {
      return (
        <img
          src={message.sticker_url}
          alt="Sticker"
          className="max-w-[150px] max-h-[150px] object-contain cursor-pointer"
          onClick={() =>
            setZoomedImage(message.sticker_url || null)
          }
        />
      )
    }

    if (message.media_url) {
      return (
        <button
          type="button"
          className="block text-left"
          onClick={() =>
            setZoomedImage(message.media_url || null)
          }
        >
          <img
            src={message.media_url}
            alt="Fotka"
            className="max-w-[300px] max-h-[360px] rounded-2xl object-cover cursor-zoom-in"
          />
        </button>
      )
    }

    if (message.content) {
      return (
        <p className="whitespace-pre-wrap break-words">
          {message.content}
        </p>
      )
    }

    return null
  }

  function conversationItems(): ChatItem[] {
    const users: ChatItem[] = contacts.map((profile) => ({
      type: 'user',
      id: profile.id,
      profile,
      last_message: profile.last_message,
      last_message_at: profile.last_message_at,
    }))

    const groupItems: ChatItem[] = groups.map((group) => ({
      type: 'group',
      id: group.id,
      group,
    }))

    return [
      ...users,
      ...groupItems,
    ]
  }

  const conversations = conversationItems()

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">
          Načítám chat…
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-white text-gray-900 flex">
      {/* SIDEBAR */}

      <aside
        className={`
          w-full md:w-[360px]
          border-r border-gray-200
          flex flex-col
          ${activeUserId || activeGroupId ? 'hidden md:flex' : 'flex'}
        `}
      >
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-2xl font-bold">
                Chat
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Tvoje konverzace
              </p>
            </div>

            <button
              type="button"
              onClick={openNewChatModal}
              className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center text-2xl hover:bg-indigo-700"
            >
              +
            </button>
          </div>

          <div className="relative">
            <input
              value={searchQuery}
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              placeholder="Hledat chaty…"
              className="w-full bg-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-5">
          {conversations.length === 0 ? (
            <div className="text-center text-gray-500 px-8 py-16">
              <div className="text-5xl mb-4">
                💬
              </div>

              <p className="font-medium">
                Zatím tu nic není
              </p>

              <p className="text-sm mt-2">
                Začni nový chat nebo vytvoř skupinu.
              </p>
            </div>
          ) : (
            conversations.map((item) => {
              if (item.type === 'user') {
                const profile = item.profile
                const selected =
                  activeUserId === profile.id

                return (
                  <button
                    key={`user-${profile.id}`}
                    type="button"
                    onClick={() =>
                      openUserChat(profile.id)
                    }
                    className={`
                      w-full flex items-center gap-3
                      p-3 rounded-2xl mb-1 text-left
                      transition
                      ${
                        selected
                          ? 'bg-indigo-50'
                          : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    <div className="relative">
                      <Avatar profile={profile} />

                      {onlineUsers.has(profile.id) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-semibold truncate">
                        {profile.first_name ||
                          profile.username ||
                          'Uživatel'}
                        {profile.last_name
                          ? ` ${profile.last_name}`
                          : ''}
                      </div>

                      <div className="text-sm text-gray-500 truncate">
                        {item.last_message ||
                          'Začni konverzaci'}
                      </div>
                    </div>
                  </button>
                )
              }

              const group = item.group
              const selected =
                activeGroupId === group.id

              return (
                <button
                  key={`group-${group.id}`}
                  type="button"
                  onClick={() =>
                    openGroup(group)
                  }
                  className={`
                    w-full flex items-center gap-3
                    p-3 rounded-2xl mb-1 text-left
                    transition
                    ${
                      selected
                        ? 'bg-indigo-50'
                        : 'hover:bg-gray-50'
                    }
                  `}
                >
                  {group.avatar_url ? (
                    <img
                      src={group.avatar_url}
                      alt={group.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
                      👥
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {group.name}
                    </div>

                    <div className="text-sm text-gray-500 truncate">
                      {group.is_private
                        ? '🔒 Soukromá skupina'
                        : '🌎 Veřejná skupina'}
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </aside>

      {/* CHAT */}

      <section
        className={`
          flex-1 flex flex-col min-w-0
          ${
            activeUserId || activeGroupId
              ? 'flex'
              : 'hidden md:flex'
          }
        `}
      >
        {!activeUserId && !activeGroupId ? (
          <div className="flex-1 flex items-center justify-center text-center px-8">
            <div>
              <div className="text-7xl mb-5">
                💬
              </div>

              <h2 className="text-2xl font-bold">
                Vyber konverzaci
              </h2>

              <p className="text-gray-500 mt-2">
                Nebo vytvoř nový chat či skupinu.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* HEADER */}

            <header className="h-[76px] border-b border-gray-200 flex items-center px-4 md:px-6 gap-3 shrink-0">
              <button
                type="button"
                onClick={() => router.push('/chat')}
                className="md:hidden w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center"
              >
                ←
              </button>

              {activeIsGroup ? (
                <>
                  {activeGroup?.avatar_url ? (
                    <img
                      src={activeGroup.avatar_url}
                      alt={activeGroup.name}
                      className="w-11 h-11 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-100 flex items-center justify-center text-xl">
                      👥
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">
                      {activeGroup?.name ||
                        'Skupina'}
                    </div>

                    <div className="text-xs text-gray-500">
                      {activeGroup?.is_private
                        ? '🔒 Soukromá skupina'
                        : '🌎 Veřejná skupina'}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative">
                    <Avatar
                      profile={activeProfile}
                    />

                    {activeProfile &&
                      onlineUsers.has(
                        activeProfile.id
                      ) && (
                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
                      )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="font-bold truncate">
                      {activeProfile?.first_name ||
                        activeProfile?.username ||
                        'Uživatel'}
                      {activeProfile?.last_name
                        ? ` ${activeProfile.last_name}`
                        : ''}
                    </div>

                    <div className="text-xs text-gray-500">
                      {activeProfile &&
                      onlineUsers.has(
                        activeProfile.id
                      )
                        ? 'Online'
                        : 'Offline'}
                    </div>
                  </div>
                </>
              )}
            </header>

            {/* MESSAGES */}

            <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
              <div className="max-w-4xl mx-auto space-y-3">
                {activeMessages.length === 0 ? (
                  <div className="h-full min-h-[300px] flex items-center justify-center text-center text-gray-500">
                    <div>
                      <div className="text-5xl mb-3">
                        👋
                      </div>

                      <p className="font-medium">
                        Začni konverzaci
                      </p>
                    </div>
                  </div>
                ) : (
                  activeMessages.map((message) => {
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
                          className={`max-w-[85%] ${
                            activeIsGroup &&
                            !own
                              ? 'flex gap-2 items-end'
                              : ''
                          }`}
                        >
                          {activeIsGroup &&
                            !own && (
                              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs shrink-0">
                                {getMessageSenderName(
                                  message.sender_id
                                ).charAt(0)}
                              </div>
                            )}

                          <div>
                            {activeIsGroup &&
                              !own && (
                                <div className="text-xs text-gray-500 mb-1 ml-1">
                                  {getMessageSenderName(
                                    message.sender_id
                                  )}
                                </div>
                              )}

                            <div
                              className={
                                message.media_url ||
                                message.sticker_url
                                  ? ''
                                  : `
                                    px-4 py-2.5 rounded-2xl
                                    ${
                                      own
                                        ? 'bg-indigo-600 text-white rounded-br-md'
                                        : 'bg-gray-100 text-gray-900 rounded-bl-md'
                                    }
                                  `
                              }
                            >
                              {renderMessageContent(
                                message
                              )}
                            </div>

                            <div
                              className={`text-[10px] text-gray-400 mt-1 ${
                                own
                                  ? 'text-right'
                                  : 'text-left'
                              }`}
                            >
                              {new Date(
                                message.created_at
                              ).toLocaleTimeString(
                                'cs-CZ',
                                {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}

                {typingUsers.length > 0 && (
                  <div className="text-sm text-gray-400">
                    někdo píše…
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* EMOJI / STICKER PICKERS */}

            {showEmojiPicker && (
              <div className="border-t border-gray-200 bg-white p-3">
                <div className="max-w-4xl mx-auto">
                  <div className="flex gap-2 mb-3">
                    <input
                      value={emojiSearch}
                      onChange={(e) =>
                        setEmojiSearch(
                          e.target.value
                        )
                      }
                      placeholder="Hledat emoji…"
                      className="flex-1 bg-gray-100 rounded-xl px-3 py-2 outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShow3DEmojis(
                          (value) => !value
                        )
                      }
                      className={`px-3 rounded-xl ${
                        show3DEmojis
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100'
                      }`}
                    >
                      🧊 3D
                    </button>
                  </div>

                  {show3DEmojis ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {FLUENT_3D.map((emoji) => (
                        <button
                          type="button"
                          key={emoji.name}
                          onClick={() =>
                            send3DEmoji(
                              emoji.url
                            )
                          }
                          className="w-16 h-16 rounded-xl hover:bg-gray-100 flex items-center justify-center shrink-0"
                        >
                          <img
                            src={emoji.url}
                            alt={emoji.name}
                            className="w-14 h-14 object-contain"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-10 md:grid-cols-15 gap-1 max-h-48 overflow-y-auto">
                      {filteredEmoji.map(
                        (emoji, index) => (
                          <button
                            type="button"
                            key={`${emoji}-${index}`}
                            onClick={() =>
                              addEmoji(emoji)
                            }
                            className="text-2xl p-1 rounded-lg hover:bg-gray-100"
                          >
                            {emoji}
                          </button>
                        )
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showStickerPicker && (
              <div className="border-t border-gray-200 bg-white p-3">
                <div className="max-w-4xl mx-auto">
                  <input
                    value={stickerSearch}
                    onChange={(e) =>
                      setStickerSearch(
                        e.target.value
                      )
                    }
                    placeholder="Hledat mezi 1000+ nálepkami…"
                    className="w-full bg-gray-100 rounded-xl px-4 py-2.5 outline-none mb-3"
                  />

                  <div className="grid grid-cols-8 md:grid-cols-12 gap-2 max-h-48 overflow-y-auto">
                    {filteredStickers.map(
                      (sticker) => (
                        <button
                          type="button"
                          key={sticker.id}
                          title={sticker.name}
                          onClick={() =>
                            sendSticker(
                              sticker
                            )
                          }
                          className="aspect-square rounded-xl hover:bg-gray-100 flex items-center justify-center text-3xl"
                        >
                          {sticker.emoji}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ATTACH */}

            {showAttachMenu && (
              <div className="border-t border-gray-200 bg-white px-4 py-3">
                <div className="max-w-4xl mx-auto">
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100"
                  >
                    <span className="text-2xl">
                      🖼️
                    </span>

                    <span className="font-medium">
                      Fotka
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* INPUT */}

            <div className="border-t border-gray-200 px-3 md:px-6 py-3 shrink-0">
              <div className="max-w-4xl mx-auto flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowAttachMenu(
                      (value) => !value
                    )
                  }
                  className="w-11 h-11 rounded-full hover:bg-gray-100 flex items-center justify-center text-xl shrink-0"
                >
                  +
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowEmojiPicker(
                      (value) => !value
                    )
                    setShowStickerPicker(false)
                  }}
                  className="w-11 h-11 rounded-full hover:bg-gray-100 flex items-center justify-center text-xl shrink-0"
                >
                  😀
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowStickerPicker(
                      (value) => !value
                    )
                    setShowEmojiPicker(false)
                  }}
                  className="w-11 h-11 rounded-full hover:bg-gray-100 flex items-center justify-center text-xl shrink-0"
                >
                  🎨
                </button>

                <textarea
                  value={newMessage}
                  onChange={(e) =>
                    handleInputChange(
                      e.target.value
                    )
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey
                    ) {
                      e.preventDefault()
                      sendMessage()
                    }
                  }}
                  placeholder="Napiš zprávu…"
                  rows={1}
                  className="flex-1 max-h-32 resize-none bg-gray-100 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
                />

                <button
                  type="button"
                  disabled={
                    sending ||
                    !newMessage.trim()
                  }
                  onClick={() =>
                    sendMessage()
                  }
                  className="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0"
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* NEW CHAT / GROUP MODAL */}

      {showNewChat && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-bold">
                Nový chat
              </h2>

              <button
                type="button"
                onClick={() =>
                  setShowNewChat(false)
                }
                className="w-9 h-9 rounded-full hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-gray-200">
              <button
                type="button"
                onClick={() =>
                  setNewChatTab('search')
                }
                className={`flex-1 py-3 font-medium ${
                  newChatTab === 'search'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500'
                }`}
              >
                👤 Chat
              </button>

              <button
                type="button"
                onClick={() =>
                  setNewChatTab('group')
                }
                className={`flex-1 py-3 font-medium ${
                  newChatTab === 'group'
                    ? 'text-indigo-600 border-b-2 border-indigo-600'
                    : 'text-gray-500'
                }`}
              >
                👥 Skupina
              </button>
            </div>

            {newChatTab === 'search' ? (
              <div className="p-5 overflow-y-auto max-h-[65vh]">
                <input
                  value={userSearch}
                  onChange={(e) =>
                    setUserSearch(
                      e.target.value
                    )
                  }
                  placeholder="Hledat uživatele…"
                  className="w-full bg-gray-100 rounded-2xl px-4 py-3 outline-none mb-4"
                />

                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() =>
                      openUserChat(user.id)
                    }
                    className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 text-left"
                  >
                    <Avatar profile={user} />

                    <div>
                      <div className="font-semibold">
                        {user.first_name ||
                          user.username ||
                          'Uživatel'}
                        {user.last_name
                          ? ` ${user.last_name}`
                          : ''}
                      </div>

                      {user.username && (
                        <div className="text-sm text-gray-500">
                          @{user.username}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-5 overflow-y-auto max-h-[65vh]">
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() =>
                      setGroupType('private')
                    }
                    className={`flex-1 py-3 rounded-xl font-medium ${
                      groupType === 'private'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    🔒 Soukromá
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setGroupType('public')
                    }
                    className={`flex-1 py-3 rounded-xl font-medium ${
                      groupType === 'public'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100'
                    }`}
                  >
                    🌎 Veřejná
                  </button>
                </div>

                <input
                  value={groupName}
                  onChange={(e) =>
                    setGroupName(
                      e.target.value
                    )
                  }
                  placeholder="Název skupiny"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none mb-3"
                />

                <textarea
                  value={groupDescription}
                  onChange={(e) =>
                    setGroupDescription(
                      e.target.value
                    )
                  }
                  placeholder="Popis skupiny (volitelné)"
                  rows={3}
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none resize-none mb-4"
                />

                <div className="font-semibold mb-2">
                  Přidat členy
                </div>

                <input
                  value={groupMemberSearch}
                  onChange={(e) =>
                    setGroupMemberSearch(
                      e.target.value
                    )
                  }
                  placeholder="Hledat členy…"
                  className="w-full bg-gray-100 rounded-xl px-4 py-3 outline-none mb-3"
                />

                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {filteredGroupMembers.map(
                    (user) => {
                      const selected =
                        selectedMembers.includes(
                          user.id
                        )

                      return (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() =>
                            setSelectedMembers(
                              (prev) =>
                                selected
                                  ? prev.filter(
                                      (id) =>
                                        id !==
                                        user.id
                                    )
                                  : [
                                      ...prev,
                                      user.id,
                                    ]
                            )
                          }
                          className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${
                            selected
                              ? 'bg-indigo-50'
                              : 'hover:bg-gray-50'
                          }`}
                        >
                          <Avatar
                            profile={user}
                            size="small"
                          />

                          <span className="flex-1 font-medium">
                            {user.first_name ||
                              user.username ||
                              'Uživatel'}
                          </span>

                          <span className="text-xl">
                            {selected
                              ? '☑️'
                              : '⬜'}
                          </span>
                        </button>
                      )
                    }
                  )}
                </div>

                <button
                  type="button"
                  disabled={
                    creatingGroup ||
                    !groupName.trim()
                  }
                  onClick={createGroup}
                  className="w-full mt-5 py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-40"
                >
                  {creatingGroup
                    ? 'Vytvářím…'
                    : 'Vytvořit skupinu'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMAGE ZOOM */}

      {zoomedImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() =>
            setZoomedImage(null)
          }
        >
          <button
            type="button"
            onClick={() =>
              setZoomedImage(null)
            }
            className="absolute top-5 right-5 w-11 h-11 rounded-full bg-white/10 text-white text-xl"
          >
            ✕
          </button>

          <img
            src={zoomedImage}
            alt="Zvětšený obrázek"
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) =>
              e.stopPropagation()
            }
          />
        </div>
      )}
    </main>
  )
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          Načítám chat…
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  )
}