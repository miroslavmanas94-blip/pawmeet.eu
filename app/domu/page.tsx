'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

type CreateTab = 'post' | 'story' | 'reel'
type TextBgType = 'transparent' | 'black' | 'white'

interface Profile {
  id: string
  username: string
  full_name?: string
  avatar_url: string
  is_verified?: boolean
}

interface Comment {
  id: string
  user_id: string
  user: Profile
  text: string
  created_at: string
}

interface PostMedia {
  url: string
  type: 'image' | 'video'
  overlay_text?: string
  text_x?: number
  text_y?: number
  text_size?: number
  text_color?: string
  text_bg?: TextBgType
}

interface Post {
  id: string
  user_id: string
  user: Profile
  media: PostMedia[]
  caption: string
  location?: string
  likes_count: number
  comments_count: number
  shares_count: number
  is_liked: boolean
  is_saved: boolean
  comments: Comment[]
  created_at: string
}

interface StoryComment {
  id: string
  user_id: string
  user: Profile
  text: string
  created_at: string
}

interface StoryItem {
  id: string
  user_id: string
  user: Profile
  media_url: string
  type: 'image' | 'video'
  overlay_text?: string
  text_x?: number
  text_y?: number
  text_size?: number
  text_color?: string
  text_bg?: TextBgType
  likes_count: number
  is_liked: boolean
  comments: StoryComment[]
  created_at: string
}

interface UserStories {
  user: Profile
  stories: StoryItem[]
  has_unseen?: boolean
}

interface NotificationItem {
  id: string
  user: Profile
  type: 'like' | 'follow' | 'comment'
  text: string
  created_at: string
  is_read: boolean
}

const SAMPLE_LOCATIONS = [
  'Praha, Česká republika',
  'Brno, Česká republika',
  'Ostrava, Česká republika',
  'Plzeň, Česká republika',
  'Bratislava, Slovensko',
  'Vídeň, Rakousko',
  'Berlín, Německo',
  'Paříž, Francie'
]

const COLOR_PRESETS = [
  '#ffffff',
  '#000000',
  '#facc15',
  '#f43f5e',
  '#a855f7',
  '#22c55e',
  '#3b82f6'
]

function getRelativeTime(dateString: string) {
  if (!dateString) return 'Právě teď'
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Právě teď'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
  return `${Math.floor(diffInSeconds / 86400)}d`
}

export default function HomeFeed() {
  const supabase = createClient()

  const [isMounted, setIsMounted] = useState(false)
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [storiesList, setStoriesList] = useState<UserStories[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [postMediaIndices, setPostMediaIndices] = useState<Record<string, number>>({})

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<CreateTab>('post')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [previewItems, setPreviewItems] = useState<{ url: string; type: 'image' | 'video' }[]>([])
  
  const [imageOverlayText, setImageOverlayText] = useState('')
  const [textSize, setTextSize] = useState<number>(24)
  const [textColor, setTextColor] = useState<string>('#ffffff')
  const [textBg, setTextBg] = useState<TextBgType>('black')
  const [textPos, setTextPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 })
  const [isDraggingText, setIsDraggingText] = useState(false)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const [createCaption, setCreateCaption] = useState('')
  const [createLocation, setCreateLocation] = useState('')
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [selectedPostForShare, setSelectedPostForShare] = useState<Post | null>(null)
  const [selectedPostForDetail, setSelectedPostForDetail] = useState<Post | null>(null)
  const [selectedPostForComments, setSelectedPostForComments] = useState<Post | null>(null)

  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null)
  const [activeStoryItemIndex, setActiveStoryItemIndex] = useState<number>(0)
  const [storyCommentInput, setStoryCommentInput] = useState('')

  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [doubleTapHeartPostId, setDoubleTapHeartPostId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const fetchFeedData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
      if (authError) console.error('Auth error:', authError)

      let activeUserProfile: Profile | null = null

      if (authUser) {
        const { data: userProfile, error: profileErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        if (profileErr) console.error('Profile fetch error:', profileErr)

        const rawUsername = userProfile?.username || authUser.user_metadata?.username || userProfile?.full_name || authUser.email?.split('@')[0] || 'Uživatel'
        const cleanUsername = rawUsername.startsWith('user_') ? 'Uživatel' : rawUsername

        activeUserProfile = {
          id: authUser.id,
          username: cleanUsername,
          full_name: userProfile?.full_name || authUser.user_metadata?.full_name || 'Uživatel',
          avatar_url: userProfile?.avatar_url || authUser.user_metadata?.avatar_url || '',
          is_verified: userProfile?.is_verified ?? false
        }
        setCurrentUser(activeUserProfile)

        const { data: rawNotifs } = await supabase
          .from('notifications')
          .select('id, type, text, created_at, is_read, sender_id')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(10)

        if (rawNotifs && rawNotifs.length > 0) {
          const senderIds = Array.from(new Set(rawNotifs.map(n => n.sender_id).filter(Boolean)))
          const senderMap = new Map<string, Profile>()
          if (senderIds.length > 0) {
            const { data: senders } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', senderIds)
            senders?.forEach(s => senderMap.set(s.id, s))
          }
          setNotifications(rawNotifs.map((n: any) => ({
            id: n.id,
            user: senderMap.get(n.sender_id) || { id: '', username: 'Uživatel', avatar_url: '' },
            type: n.type,
            text: n.text,
            created_at: getRelativeTime(n.created_at),
            is_read: n.is_read
          })))
        }
      } else {
        setCurrentUser({ id: 'guest', username: 'Host', avatar_url: '', is_verified: false })
      }

      const { data: rawPosts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })

      if (postsError) console.error('CHYBA PŘI NAČÍTÁNÍ POSTS:', postsError.message)

      const postsList = rawPosts || []

      if (postsList.length > 0) {
        const postIds = postsList.map(p => p.id)
        const userIds = Array.from(new Set(postsList.map(p => p.user_id).filter(Boolean)))

        const profilesMap = new Map<string, any>()
        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, is_verified')
            .in('id', userIds)
          profilesData?.forEach(profile => profilesMap.set(profile.id, profile))
        }

        const [{ data: likesData }, { data: commentsData }] = await Promise.all([
          supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
          supabase.from('comments').select('id, post_id, text, created_at, user_id').in('post_id', postIds).order('created_at', { ascending: true })
        ])

        const commentUserIds = Array.from(new Set(commentsData?.map(c => c.user_id).filter(Boolean) || []))
        const commentProfilesMap = new Map<string, any>()

        if (commentUserIds.length > 0) {
          const { data: commentProfiles } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url')
            .in('id', commentUserIds)
          commentProfiles?.forEach(p => commentProfilesMap.set(p.id, p))
        }

        const formattedPosts: Post[] = postsList.map((p: any) => {
          let mediaArr: PostMedia[] = []
          try {
            const parsed = JSON.parse(p.media_url)
            mediaArr = Array.isArray(parsed) ? parsed : [{
              url: p.media_url,
              type: p.media_type || 'image',
              overlay_text: p.overlay_text,
              text_x: p.text_x,
              text_y: p.text_y,
              text_size: p.text_size,
              text_color: p.text_color,
              text_bg: p.text_bg
            }]
          } catch {
            mediaArr = [{
              url: p.media_url,
              type: p.media_type || 'image',
              overlay_text: p.overlay_text,
              text_x: p.text_x,
              text_y: p.text_y,
              text_size: p.text_size,
              text_color: p.text_color,
              text_bg: p.text_bg
            }]
          }

          const profileData = profilesMap.get(p.user_id) || {}
          const rawAuthorName = profileData.username || profileData.full_name || 'Uživatel'
          const cleanAuthorUsername = rawAuthorName.startsWith('user_') ? (profileData.full_name || 'Uživatel') : rawAuthorName

          const author: Profile = {
            id: p.user_id,
            username: cleanAuthorUsername,
            full_name: profileData.full_name || 'Uživatel',
            avatar_url: profileData.avatar_url || '',
            is_verified: profileData.is_verified || false
          }

          const postLikes = likesData?.filter(l => l.post_id === p.id) || []
          const postComments = commentsData?.filter(c => c.post_id === p.id) || []

          return {
            id: p.id,
            user_id: p.user_id,
            user: author,
            media: mediaArr,
            caption: p.caption || '',
            location: p.location,
            likes_count: postLikes.length,
            comments_count: postComments.length,
            shares_count: 3,
            is_liked: authUser ? postLikes.some(l => l.user_id === authUser.id) : false,
            is_saved: false,
            comments: postComments.map((c: any) => {
              const cUser = commentProfilesMap.get(c.user_id) || { username: 'Anonym', avatar_url: '' }
              const cCleanUsername = cUser.username && !cUser.username.startsWith('user_')
                ? cUser.username
                : (cUser.full_name || 'Anonym')

              return {
                id: c.id,
                user_id: c.user_id,
                user: { id: c.user_id, username: cCleanUsername, avatar_url: cUser.avatar_url || '' },
                text: c.text,
                created_at: getRelativeTime(c.created_at)
              }
            }),
            created_at: getRelativeTime(p.created_at)
          }
        })

        setPosts(formattedPosts)
      } else {
        setPosts([])
      }

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const { data: rawStories } = await supabase
        .from('stories')
        .select('*')
        .gt('created_at', twentyFourHoursAgo)
        .order('created_at', { ascending: true })

      if (rawStories && rawStories.length > 0) {
        const storyIds = rawStories.map(s => s.id)
        const storyUserIds = Array.from(new Set(rawStories.map(s => s.user_id).filter(Boolean)))

        const [storyLikesRes, storyCommentsRes, storyProfilesRes] = await Promise.all([
          supabase.from('story_likes').select('story_id, user_id').in('story_id', storyIds),
          supabase.from('story_comments').select('id, story_id, user_id, text, created_at').in('story_id', storyIds).order('created_at', { ascending: true }),
          storyUserIds.length > 0 ? supabase.from('profiles').select('id, username, full_name, avatar_url, is_verified').in('id', storyUserIds) : Promise.resolve({ data: [] })
        ])

        const storyProfilesMap = new Map<string, any>()
        storyProfilesRes.data?.forEach(p => storyProfilesMap.set(p.id, p))

        const scUserIds = Array.from(new Set(storyCommentsRes.data?.map(c => c.user_id).filter(Boolean) || []))
        if (scUserIds.length > 0) {
          const { data: scProfiles } = await supabase.from('profiles').select('id, username, full_name, avatar_url').in('id', scUserIds)
          scProfiles?.forEach(p => storyProfilesMap.set(p.id, p))
        }

        const storyCommentsMap = new Map<string, StoryComment[]>()
        storyCommentsRes.data?.forEach((sc: any) => {
          const u = storyProfilesMap.get(sc.user_id) || { username: 'Anonym', avatar_url: '' }
          const item: StoryComment = {
            id: sc.id,
            user_id: sc.user_id,
            user: { id: sc.user_id, username: u.username || 'Uživatel', avatar_url: u.avatar_url || '' },
            text: sc.text,
            created_at: getRelativeTime(sc.created_at)
          }
          if (!storyCommentsMap.has(sc.story_id)) {
            storyCommentsMap.set(sc.story_id, [])
          }
          storyCommentsMap.get(sc.story_id)?.push(item)
        })

        const groupedMap = new Map<string, UserStories>()
        rawStories.forEach((s: any) => {
          const uid = s.user_id || 'unknown'
          let sUser = storyProfilesMap.get(uid) || { username: 'Uživatel', avatar_url: '' }
          const sCleanUsername = sUser.username && !sUser.username.startsWith('user_')
            ? sUser.username
            : (sUser.full_name || 'Uživatel')

          if (!groupedMap.has(uid)) {
            groupedMap.set(uid, {
              user: { id: uid, username: sCleanUsername, avatar_url: sUser.avatar_url || '', is_verified: sUser.is_verified || false },
              stories: [],
              has_unseen: true
            })
          }

          const sLikes = storyLikesRes.data?.filter(l => l.story_id === s.id) || []
          const isLiked = authUser ? sLikes.some(l => l.user_id === authUser.id) : false

          groupedMap.get(uid)?.stories.push({
            id: s.id,
            user_id: uid,
            user: { id: uid, username: sCleanUsername, avatar_url: sUser.avatar_url || '', is_verified: sUser.is_verified || false },
            media_url: s.media_url,
            type: s.media_type || 'image',
            overlay_text: s.overlay_text,
            text_x: s.text_x,
            text_y: s.text_y,
            text_size: s.text_size,
            text_color: s.text_color || '#ffffff',
            text_bg: s.text_bg || 'black',
            likes_count: sLikes.length,
            is_liked: isLiked,
            comments: storyCommentsMap.get(s.id) || [],
            created_at: s.created_at
          })
        })

        const allStoriesGroups = Array.from(groupedMap.values())
        if (activeUserProfile && activeUserProfile.id !== 'guest') {
          allStoriesGroups.sort((a, b) => {
            if (a.user.id === activeUserProfile.id) return -1
            if (b.user.id === activeUserProfile.id) return 1
            return 0
          })
        }
        setStoriesList(allStoriesGroups)
      } else {
        setStoriesList([])
      }

    } catch (err) {
      console.error('HLAVNÍ CHYBA FEEDU:', err)
      setPosts([])
      setStoriesList([])
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    if (!isMounted) return

    fetchFeedData()

    const channel = supabase
      .channel('realtime_feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => {
        fetchFeedData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => {
        fetchFeedData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchFeedData, isMounted, supabase])

  const handleNextStory = useCallback(() => {
    if (activeStoryGroupIndex === null) return
    const currentGroup = storiesList[activeStoryGroupIndex]
    if (!currentGroup) return

    if (activeStoryItemIndex < currentGroup.stories.length - 1) {
      setActiveStoryItemIndex(prev => prev + 1)
    } else if (activeStoryGroupIndex < storiesList.length - 1) {
      setActiveStoryGroupIndex(prev => (prev !== null ? prev + 1 : null))
      setActiveStoryItemIndex(0)
    } else {
      setActiveStoryGroupIndex(null)
    }
  }, [activeStoryGroupIndex, activeStoryItemIndex, storiesList])

  const handlePrevStory = useCallback(() => {
    if (activeStoryGroupIndex === null) return
    if (activeStoryItemIndex > 0) {
      setActiveStoryItemIndex(prev => prev - 1)
    } else if (activeStoryGroupIndex > 0) {
      const prevGroup = activeStoryGroupIndex - 1
      setActiveStoryGroupIndex(prevGroup)
      setActiveStoryItemIndex(storiesList[prevGroup]?.stories.length - 1 || 0)
    }
  }, [activeStoryGroupIndex, activeStoryItemIndex, storiesList])

  useEffect(() => {
    if (activeStoryGroupIndex === null) return
    const timer = setTimeout(() => {
      handleNextStory()
    }, 5500)
    return () => clearTimeout(timer)
  }, [activeStoryGroupIndex, activeStoryItemIndex, handleNextStory])

  const handleToggleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const isLiked = post.is_liked

    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      is_liked: !isLiked,
      likes_count: !isLiked ? p.likes_count + 1 : Math.max(0, p.likes_count - 1)
    } : p))

    if (selectedPostForDetail?.id === postId) {
      setSelectedPostForDetail(prev => prev ? {
        ...prev,
        is_liked: !isLiked,
        likes_count: !isLiked ? prev.likes_count + 1 : Math.max(0, prev.likes_count - 1)
      } : null)
    }

    if (currentUser && currentUser.id !== 'guest') {
      if (isLiked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id })
      }
    }
  }

  const handleToggleSave = (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return
    const nextSaved = !post.is_saved
    if (typeof window !== 'undefined') {
      const directLink = `${window.location.origin}/domu#post-${postId}`
      navigator.clipboard.writeText(directLink)
    }
    showToast(nextSaved ? 'Uloženo a odkaz zkopírován!' : 'Odebráno z uložených')
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: nextSaved } : p))
  }

  const handleAddComment = async (postId: string) => {
    const text = commentInput[postId]?.trim()
    if (!text || !currentUser) return

    if (currentUser.id === 'guest') {
      showToast('Pro přidání komentáře se musíte přihlásit!')
      return
    }

    setCommentInput(prev => ({ ...prev, [postId]: '' }))

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: currentUser.id,
        text: text
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('Chyba při ukládání komentáře do Supabase:', error.message)
      showToast(`Chyba ukládání: ${error.message}`)
      return
    }

    const newComment: Comment = {
      id: data ? data.id : `temp_${Date.now()}`,
      user_id: currentUser.id,
      user: currentUser,
      text,
      created_at: 'Právě teď'
    }

    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      comments: [...p.comments, newComment],
      comments_count: p.comments_count + 1
    } : p))

    if (selectedPostForDetail?.id === postId) {
      setSelectedPostForDetail(prev => prev ? {
        ...prev,
        comments: [...prev.comments, newComment],
        comments_count: prev.comments_count + 1
      } : null)
    }
    if (selectedPostForComments?.id === postId) {
      setSelectedPostForComments(prev => prev ? {
        ...prev,
        comments: [...prev.comments, newComment],
        comments_count: prev.comments_count + 1
      } : null)
    }

    showToast('Komentář uložen!')
  }

  const handleAddStoryComment = async () => {
    if (!storyCommentInput.trim() || !currentUser || activeStoryGroupIndex === null) return
    const activeGroup = storiesList[activeStoryGroupIndex]
    const activeStory = activeGroup?.stories[activeStoryItemIndex]
    if (!activeStory) return

    if (currentUser.id === 'guest') {
      showToast('Pro reagování se přihlaste')
      return
    }

    const text = storyCommentInput.trim()
    setStoryCommentInput('')

    const { data, error } = await supabase
      .from('story_comments')
      .insert({ story_id: activeStory.id, user_id: currentUser.id, text })
      .select('id')
      .single()

    if (error) {
      console.error('Chyba při ukládání komentáře k příběhu:', error.message)
      showToast(`Chyba: ${error.message}`)
      return
    }

    const newSc: StoryComment = {
      id: data.id,
      user_id: currentUser.id,
      user: currentUser,
      text,
      created_at: 'Právě teď'
    }

    setStoriesList(prev => prev.map((g, gIdx) => gIdx === activeStoryGroupIndex ? {
      ...g,
      stories: g.stories.map((st, sIdx) => sIdx === activeStoryItemIndex ? {
        ...st,
        comments: [...st.comments, newSc]
      } : st)
    } : g))
  }

  const handleDeleteComment = async (postId: string, commentId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: p.comments.filter(c => c.id !== commentId),
          comments_count: Math.max(0, p.comments_count - 1)
        }
      }
      return p
    }))

    if (selectedPostForDetail?.id === postId) {
      setSelectedPostForDetail(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId),
        comments_count: Math.max(0, prev.comments_count - 1)
      } : null)
    }

    if (selectedPostForComments?.id === postId) {
      setSelectedPostForComments(prev => prev ? {
        ...prev,
        comments: prev.comments.filter(c => c.id !== commentId),
        comments_count: Math.max(0, prev.comments_count - 1)
      } : null)
    }

    showToast('Komentář smazán')
    if (!commentId.startsWith('temp_')) {
      await supabase.from('comments').delete().eq('id', commentId)
    }
  }

  const handleDeletePost = async (postId: string, postUserId: string) => {
    if (!currentUser || currentUser.id !== postUserId) {
      showToast('Můžeš mazat pouze své vlastní příspěvky!')
      return
    }

    setPosts(prev => prev.filter(p => p.id !== postId))
    setSelectedPostForDetail(null)
    setSelectedPostForComments(null)
    showToast('Příspěvek smazán')

    const { error } = await supabase.from('posts').delete().eq('id', postId)
    if (error) console.error('Chyba při mazání z databáze:', error.message)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadFiles(files)
    setPreviewItems(files.map(f => ({
      url: URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'image'
    })))
  }

  const resetCreateModal = () => {
    setIsCreateOpen(false)
    setUploadFiles([])
    setPreviewItems([])
    setImageOverlayText('')
    setTextSize(24)
    setTextColor('#ffffff')
    setTextBg('black')
    setTextPos({ x: 50, y: 50 })
    setCreateCaption('')
    setCreateLocation('')
    setShowLocationSuggestions(false)
  }

  const handleTouchOrMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingText || !previewContainerRef.current) return
    const rect = previewContainerRef.current.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY

    const x = Math.max(10, Math.min(90, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(10, Math.min(90, ((clientY - rect.top) / rect.height) * 100))
    setTextPos({ x, y })
  }

  const handlePublishContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!previewItems.length) return

    if (!currentUser || currentUser.id === 'guest') {
      showToast('Pro publikování příspěvků musíte být přihlášeni!')
      return
    }

    setIsUploading(true)
    try {
      const uploadedMediaUrls: PostMedia[] = []
      for (const file of uploadFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const bucketName = createTab === 'story' ? 'stories' : 'posts'

        const { error: uploadError } = await supabase.storage.from(bucketName).upload(fileName, file)
        if (uploadError) {
          console.error('Chyba nahrávání souboru:', uploadError.message)
        } else {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
          uploadedMediaUrls.push({ 
            url: data.publicUrl, 
            type: file.type.startsWith('video') ? 'video' : 'image',
            overlay_text: imageOverlayText || undefined,
            text_x: textPos.x,
            text_y: textPos.y,
            text_size: textSize,
            text_color: textColor,
            text_bg: textBg
          })
        }
      }

      const mediaToSave = uploadedMediaUrls.length > 0 
        ? uploadedMediaUrls 
        : previewItems.map(i => ({ 
            url: i.url, 
            type: i.type, 
            overlay_text: imageOverlayText || undefined,
            text_x: textPos.x,
            text_y: textPos.y,
            text_size: textSize,
            text_color: textColor,
            text_bg: textBg
          }))

      if (createTab === 'story') {
        const { error: storyErr } = await supabase.from('stories').insert({
          user_id: currentUser.id,
          media_url: mediaToSave[0].url,
          media_type: mediaToSave[0].type,
          overlay_text: imageOverlayText || null,
          text_x: textPos.x,
          text_y: textPos.y,
          text_size: textSize,
          text_color: textColor,
          text_bg: textBg
        })
        if (storyErr) throw storyErr
        showToast('Příběh publikován!')
      } else {
        const { error: postErr } = await supabase.from('posts').insert({
          user_id: currentUser.id,
          media_url: JSON.stringify(mediaToSave),
          media_type: createTab === 'reel' ? 'video' : mediaToSave[0].type,
          caption: createCaption,
          location: createLocation || null,
          overlay_text: imageOverlayText || null,
          text_x: textPos.x,
          text_y: textPos.y,
          text_size: textSize,
          text_color: textColor,
          text_bg: textBg
        })
        if (postErr) throw postErr
        showToast(createTab === 'reel' ? 'Reel publikován!' : 'Příspěvek publikován!')
      }

      resetCreateModal()
      await fetchFeedData()
    } catch (err: any) {
      console.error('Chyba při publikování:', err)
      showToast(`Ukládání selhalo: ${err.message || 'Chyba databáze'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const renderTextStyles = (color: string = '#ffffff', bg: TextBgType = 'black') => {
    let backgroundClass = 'bg-black/80 border-white/20'
    if (bg === 'transparent') backgroundClass = 'bg-transparent border-transparent shadow-none'
    if (bg === 'white') backgroundClass = 'bg-white/90 border-slate-200 shadow-lg'
    if (bg === 'black') backgroundClass = 'bg-black/85 border-white/20 shadow-2xl'

    return { backgroundClass, color }
  }

  if (!isMounted) {
    return (
      <div className="min-h-screen w-full bg-slate-100 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const locationMatches = createLocation.trim()
    ? SAMPLE_LOCATIONS.filter(loc => loc.toLowerCase().includes(createLocation.toLowerCase()))
    : []

  const myStoryGroup = currentUser ? storiesList.find(s => s.user.id === currentUser.id) : null
  const activeGroup = activeStoryGroupIndex !== null ? storiesList[activeStoryGroupIndex] : null
  const activeStory = activeGroup ? activeGroup.stories[activeStoryItemIndex] : null

  return (
    <div className="min-h-screen w-full bg-slate-100 text-slate-800 font-sans antialiased flex flex-col selection:bg-violet-600 selection:text-white">
      
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full text-xs font-extrabold shadow-2xl border border-slate-700 animate-bounce">
          ✨ {toastMessage}
        </div>
      )}

      {/* Horní lišta */}
      <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2"></div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => { setCreateTab('post'); setIsCreateOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-500 hover:opacity-90 text-white font-black text-xs shadow-md shadow-violet-500/20 transition cursor-pointer active:scale-95"
          >
            <span className="text-sm font-black">+</span>
            <span>Vytvořit</span>
          </button>

          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications.some(n => !n.is_read) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white animate-ping" />
            )}
          </button>
        </div>

        {isNotificationsOpen && (
          <div className="absolute right-4 sm:right-8 top-16 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 mb-2">
              <span className="font-extrabold text-xs text-slate-900">Upozornění</span>
              <button onClick={() => setIsNotificationsOpen(false)} className="text-slate-400 hover:text-slate-700 text-xs font-bold">✕</button>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs font-medium">Žádná nová upozornění</div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="flex items-center gap-2.5 text-xs p-2.5 hover:bg-slate-50 rounded-xl transition border border-transparent hover:border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-rose-500 p-[1.5px] shrink-0">
                      <div className="w-full h-full rounded-full bg-white overflow-hidden flex items-center justify-center font-bold text-slate-700">
                        {n.user.avatar_url ? (
                          <img src={n.user.avatar_url} alt={n.user.username} className="w-full h-full object-cover" />
                        ) : (
                          <span>{n.user.username[0]?.toUpperCase()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 block truncate">{n.user.username}</span>
                      <span className="text-slate-500 text-[11px]">{n.text}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5 pb-24 flex flex-col items-center">
        
        {/* Příběhy */}
        <section className="w-full bg-white rounded-2xl border border-slate-200 p-4 mb-6 shadow-sm overflow-visible">
          <div className="flex gap-4 items-center overflow-x-auto overflow-y-visible scrollbar-none py-2 px-1">
            <div
              onClick={() => {
                if (myStoryGroup) {
                  const myGroupIdx = storiesList.findIndex(s => s.user.id === currentUser?.id)
                  setActiveStoryGroupIndex(myGroupIdx !== -1 ? myGroupIdx : 0)
                  setActiveStoryItemIndex(0)
                } else {
                  setCreateTab('story')
                  setIsCreateOpen(true)
                }
              }}
              className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group relative overflow-visible"
            >
              <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] ${myStoryGroup ? 'bg-gradient-to-tr from-amber-400 via-rose-500 to-violet-600 shadow-md' : 'bg-slate-200 border-2 border-dashed border-violet-400'} transition-transform duration-200 group-hover:scale-105`}>
                <div className="w-full h-full rounded-full bg-slate-100 overflow-visible relative flex flex-col items-center justify-center">
                  {currentUser?.avatar_url ? (
                    <img src={currentUser.avatar_url} alt={currentUser.username} className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="text-lg font-black text-violet-600">{currentUser?.username[0]?.toUpperCase() || 'M'}</span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setCreateTab('story')
                      setIsCreateOpen(true)
                    }}
                    className="absolute -bottom-1 -right-1 bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow-lg border-2 border-white z-20 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>
              <span className="text-[11px] font-bold text-slate-700 truncate max-w-[70px]">Můj příběh</span>
            </div>

            {storiesList.filter(sg => sg.user.id !== currentUser?.id).map((storyGroup) => {
              const realIndex = storiesList.findIndex(sg => sg.user.id === storyGroup.user.id)

              return (
                <div
                  key={storyGroup.user.id}
                  onClick={() => {
                    setActiveStoryGroupIndex(realIndex)
                    setActiveStoryItemIndex(0)
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer shrink-0 group overflow-visible"
                >
                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 rounded-full p-[3px] ${storyGroup.has_unseen ? 'bg-gradient-to-tr from-amber-400 via-fuchsia-500 to-violet-600 shadow-md animate-pulse' : 'bg-slate-300'} transition-transform duration-200 group-hover:scale-105`}>
                    <div className="w-full h-full rounded-full bg-slate-100 overflow-hidden relative flex items-center justify-center">
                      {storyGroup.user.avatar_url ? (
                        <img src={storyGroup.user.avatar_url} alt={storyGroup.user.username} className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <span className="text-sm font-black text-slate-700">{storyGroup.user.username[0]?.toUpperCase()}</span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-700 truncate max-w-[70px]">{storyGroup.user.username}</span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Hlavní Příspěvky */}
        {isLoading ? (
          <div className="w-full space-y-6">
            {[1, 2].map(n => (
              <div key={n} className="bg-white rounded-2xl p-5 border border-slate-200 animate-pulse space-y-4 shadow-sm">
                <div className="w-48 h-4 bg-slate-200 rounded-lg" />
                <div className="w-full h-72 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="w-full bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 my-4 shadow-sm space-y-3">
            <span className="text-4xl block">🚀</span>
            <p className="text-base font-extrabold text-slate-800">Zatím žádné příspěvky v kanálu</p>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">Přidejte nový příspěvek tlačítkem "+ Vytvořit".</p>
          </div>
        ) : (
          <div className="w-full space-y-6">
            {posts.map(post => {
              const currentMediaIndex = postMediaIndices[post.id] || 0
              const currentMedia = post.media[currentMediaIndex] || post.media[0]
              const hasMultipleMedia = post.media.length > 1
              const isReel = currentMedia?.type === 'video'
              const isOwner = currentUser && currentUser.id === post.user_id
              const { backgroundClass, color } = renderTextStyles(currentMedia?.text_color, currentMedia?.text_bg)

              return (
                <article id={`post-${post.id}`} key={post.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden w-full shadow-sm transition hover:shadow-md">
                  <div className="flex justify-between items-center px-4 py-3 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-violet-500 via-fuchsia-500 to-rose-500 shadow-sm shrink-0">
                        <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center font-bold text-slate-800">
                          {post.user.avatar_url ? (
                            <img src={post.user.avatar_url} alt={post.user.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-xs font-black">{post.user.username[0]?.toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900 tracking-wide">{post.user.username}</span>
                          {post.user.is_verified && <span className="text-violet-600 text-xs">✓</span>}
                          <span className="text-slate-400 text-[11px]">• {post.created_at}</span>
                        </div>
                        {post.location && <span className="text-[11px] font-semibold text-rose-500 block">{post.location}</span>}
                      </div>
                    </div>

                    {isOwner && (
                      <button
                        onClick={() => handleDeletePost(post.id, post.user_id)}
                        className="text-slate-400 hover:text-rose-600 text-xs font-bold p-1 transition cursor-pointer"
                        title="Smazat příspěvek"
                      >
                        🗑️
                      </button>
                    )}
                  </div>

                  <div
                    onClick={() => setSelectedPostForDetail(post)}
                    className="relative bg-slate-900 max-h-[420px] w-full overflow-hidden flex items-center justify-center cursor-pointer group select-none"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      if (!post.is_liked) handleToggleLike(post.id)
                      setDoubleTapHeartPostId(post.id)
                      setTimeout(() => setDoubleTapHeartPostId(null), 800)
                    }}
                  >
                    {isReel ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <video src={currentMedia.url} autoPlay loop muted playsInline className="w-full max-h-[420px] object-contain pointer-events-none" />
                      </div>
                    ) : (
                      <img src={currentMedia?.url} alt="" className="w-full max-h-[420px] object-contain bg-slate-900" />
                    )}

                    {currentMedia?.overlay_text && (
                      <div 
                        className="absolute pointer-events-none z-15 -translate-x-1/2 -translate-y-1/2"
                        style={{
                          left: `${currentMedia.text_x ?? 50}%`,
                          top: `${currentMedia.text_y ?? 50}%`
                        }}
                      >
                        <span 
                          className={`font-black px-4 py-2 rounded-xl text-center backdrop-blur-md border inline-block ${backgroundClass}`}
                          style={{ fontSize: `${currentMedia.text_size ?? 24}px`, color }}
                        >
                          {currentMedia.overlay_text}
                        </span>
                      </div>
                    )}

                    {hasMultipleMedia && (
                      <>
                        {currentMediaIndex > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPostMediaIndices(prev => ({ ...prev, [post.id]: currentMediaIndex - 1 }))
                            }}
                            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/80 text-slate-900 p-2 rounded-xl text-xs backdrop-blur-md cursor-pointer z-10 shadow"
                          >
                            ◀
                          </button>
                        )}
                        {currentMediaIndex < post.media.length - 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setPostMediaIndices(prev => ({ ...prev, [post.id]: currentMediaIndex + 1 }))
                            }}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/80 text-slate-900 p-2 rounded-xl text-xs backdrop-blur-md cursor-pointer z-10 shadow"
                          >
                            ▶
                          </button>
                        )}
                      </>
                    )}

                    {doubleTapHeartPostId === post.id && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                        <span className="text-6xl animate-ping drop-shadow-2xl">❤️</span>
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-5">
                      <button
                        onClick={() => handleToggleLike(post.id)}
                        className="text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-125"
                      >
                        <svg
                          className={`w-6 h-6 transition-colors duration-200 ${
                            post.is_liked ? 'fill-rose-500 stroke-rose-500 text-rose-500' : 'fill-none stroke-slate-600 hover:stroke-slate-900'
                          }`}
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 016.364 0L12 7.636l1.318-1.318a4.5 4.5 0 116.364 6.364L12 21.364l-7.682-7.682a4.5 4.5 0 010-6.364z" />
                        </svg>
                      </button>

                      <button
                        onClick={() => setSelectedPostForComments(post)}
                        className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1.5 cursor-pointer"
                      >
                        <svg className="w-6 h-6 stroke-slate-600 hover:stroke-slate-900" fill="none" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        {post.comments_count > 0 && <span className="text-slate-800 text-xs font-black">{post.comments_count}</span>}
                      </button>

                      <button
                        onClick={() => setSelectedPostForShare(post)}
                        className="text-slate-600 hover:text-slate-900 cursor-pointer flex items-center gap-1 transition-transform active:scale-95"
                      >
                        <svg className="w-6 h-6 stroke-slate-600 hover:stroke-slate-900" fill="none" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleSave(post.id)}
                      className={`cursor-pointer ${post.is_saved ? 'text-amber-500' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      <svg className={`w-5 h-5 ${post.is_saved ? 'fill-amber-500 stroke-amber-500' : 'fill-none stroke-currentColor'}`} strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                    </button>
                  </div>

                  <div className="px-4 py-3 space-y-1.5 bg-white">
                    {post.likes_count > 0 && (
                      <p className="text-xs font-black text-slate-900">{post.likes_count} to se líbí</p>
                    )}

                    {post.caption && (
                      <p className="text-xs text-slate-800 leading-relaxed">
                        <span className="font-extrabold mr-1.5 text-slate-900">{post.user.username}</span>
                        {post.caption}
                      </p>
                    )}

                    {post.comments.length > 0 && (
                      <div className="pt-2 space-y-1.5 border-t border-slate-100 mt-2">
                        <span className="text-[11px] font-bold text-slate-500 block">
                          Komentáře ({post.comments.length}):
                        </span>

                        {post.comments.map(c => (
                          <div key={c.id} className="flex items-center justify-between text-xs text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100">
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-extrabold text-slate-900 shrink-0">{c.user.username}:</span>
                              <span className="truncate text-slate-700">{c.text}</span>
                            </div>
                            {currentUser && (c.user_id === currentUser.id || currentUser.id !== 'guest') && (
                              <button onClick={() => handleDeleteComment(post.id, c.id)} className="text-slate-400 hover:text-rose-600 font-bold ml-2">✕</button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Přidat komentář..."
                      value={commentInput[post.id] || ''}
                      onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(post.id) }}
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 placeholder-slate-400 outline-none focus:border-violet-500 transition"
                    />
                    <button
                      onClick={() => handleAddComment(post.id)}
                      disabled={!commentInput[post.id]?.trim()}
                      className="text-xs font-black text-violet-600 disabled:opacity-40 cursor-pointer px-2"
                    >
                      Poslat
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* Story Viewer Modal */}
      {activeGroup && activeStory && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-2 sm:p-4">
          <div className="relative w-full max-w-[420px] h-[88vh] max-h-[750px] bg-slate-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800">
            
            <div className="absolute top-3 left-3 right-3 z-30 flex gap-1">
              {activeGroup.stories.map((s, idx) => (
                <div key={s.id} className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className={`h-full bg-gradient-to-r from-violet-400 to-rose-400 transition-all duration-300 ${
                      idx < activeStoryItemIndex ? 'w-full' : idx === activeStoryItemIndex ? 'w-full animate-pulse' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            <div className="absolute top-6 left-4 right-4 z-30 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5 bg-black/50 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
                <div className="w-7 h-7 rounded-full overflow-hidden border border-white/30 bg-slate-800 flex items-center justify-center">
                  {activeGroup.user.avatar_url ? (
                    <img src={activeGroup.user.avatar_url} alt={activeGroup.user.username} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold">{activeGroup.user.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <span className="text-xs font-extrabold">{activeGroup.user.username}</span>
                <span className="text-[10px] text-white/70">• {getRelativeTime(activeStory.created_at)}</span>
              </div>

              <button
                onClick={() => setActiveStoryGroupIndex(null)}
                className="w-8 h-8 rounded-full bg-black/60 text-white font-bold text-xs flex items-center justify-center hover:bg-black cursor-pointer border border-white/20"
              >
                ✕
              </button>
            </div>

            <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black">
              {activeStory.type === 'video' ? (
                <video src={activeStory.media_url} autoPlay playsInline loop muted className="w-full h-full object-cover" />
              ) : (
                <img src={activeStory.media_url} alt="" className="w-full h-full object-cover" />
              )}

              {activeStory.overlay_text && (
                <div 
                  className="absolute pointer-events-none z-15 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${activeStory.text_x ?? 50}%`,
                    top: `${activeStory.text_y ?? 50}%`
                  }}
                >
                  <span 
                    className={`font-black px-5 py-2.5 rounded-2xl text-center backdrop-blur-md border inline-block ${renderTextStyles(activeStory.text_color, activeStory.text_bg).backgroundClass}`}
                    style={{
                      fontSize: `${activeStory.text_size ?? 24}px`,
                      color: activeStory.text_color || '#ffffff'
                    }}
                  >
                    {activeStory.overlay_text}
                  </span>
                </div>
              )}

              <div onClick={handlePrevStory} className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer" />
              <div onClick={handleNextStory} className="absolute right-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer" />
            </div>

            <div className="p-3 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-30 flex flex-col gap-2">
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1">
                {activeStory.comments.length === 0 ? (
                  <p className="text-[10px] text-slate-400 text-center py-1 font-semibold">Zatím žádné komentáře ke story</p>
                ) : (
                  activeStory.comments.map(sc => (
                    <div key={sc.id} className="flex justify-between items-center text-[11px] bg-slate-950/90 px-3 py-1.5 rounded-xl text-white border border-slate-800">
                      <span className="truncate">
                        <strong className="mr-1.5 text-violet-400">{sc.user.username}:</strong>
                        {sc.text}
                      </span>
                      {currentUser && (sc.user_id === currentUser.id || currentUser.id !== 'guest') && (
                        <button
                          onClick={async () => {
                            setStoriesList(prev => prev.map(g => ({
                              ...g,
                              stories: g.stories.map(st => st.id === activeStory.id ? { ...st, comments: st.comments.filter(c => c.id !== sc.id) } : st)
                            })))
                            if (!sc.id.startsWith('temp_')) {
                              await supabase.from('story_comments').delete().eq('id', sc.id)
                            }
                          }}
                          className="text-slate-400 hover:text-rose-500 font-bold ml-2 cursor-pointer"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Napsat odpověď na příběh..."
                  value={storyCommentInput}
                  onChange={(e) => setStoryCommentInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddStoryComment() }}
                  className="flex-1 bg-slate-950 text-white placeholder-slate-400 text-xs rounded-xl px-3.5 py-2 outline-none border border-slate-800 focus:border-violet-500"
                />
                <button
                  onClick={handleAddStoryComment}
                  disabled={!storyCommentInput.trim()}
                  className="text-white text-xs font-bold px-3.5 py-2 bg-gradient-to-r from-violet-600 to-rose-500 rounded-xl hover:opacity-90 disabled:opacity-40 transition cursor-pointer shadow-md"
                >
                  Odeslat
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Vytvoření příspěvku Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden border border-slate-200 shadow-2xl flex flex-col max-h-[92vh]">
            <div className="flex border-b border-slate-100 p-2.5 bg-slate-50 justify-between items-center shrink-0">
              <div className="flex gap-1.5">
                {(['post', 'story', 'reel'] as CreateTab[]).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setCreateTab(tab)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition ${
                      createTab === tab ? 'bg-gradient-to-r from-violet-600 to-rose-500 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {tab === 'post' ? 'Příspěvek' : tab === 'story' ? 'Příběh' : 'Reel'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={resetCreateModal} className="text-slate-400 font-bold text-xs p-1">✕</button>
            </div>

            <form onSubmit={handlePublishContent} className="p-4 space-y-4 overflow-y-auto flex-1">
              <div 
                ref={previewContainerRef}
                onMouseDown={() => setIsDraggingText(true)}
                onMouseUp={() => setIsDraggingText(false)}
                onMouseMove={handleTouchOrMouseMove}
                onTouchStart={() => setIsDraggingText(true)}
                onTouchEnd={() => setIsDraggingText(false)}
                onTouchMove={handleTouchOrMouseMove}
                className="relative border-2 border-dashed border-slate-200 hover:border-violet-400 rounded-2xl overflow-hidden bg-slate-950 flex flex-col items-center justify-center min-h-[220px] select-none transition"
              >
                <input
                  type="file"
                  multiple={createTab === 'post'}
                  accept={createTab === 'reel' ? 'video/*' : 'image/*,video/*'}
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-30"
                />

                {previewItems.length > 0 ? (
                  <div className="relative w-full h-56 bg-slate-900 flex items-center justify-center overflow-hidden">
                    {previewItems[0].type === 'video' ? (
                      <video src={previewItems[0].url} autoPlay loop muted controls className="w-full h-full object-contain pointer-events-none" />
                    ) : (
                      <img src={previewItems[0].url} alt="" className="w-full h-full object-contain pointer-events-none" />
                    )}

                    {imageOverlayText.trim() && (
                      <div 
                        className="absolute z-20 -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing pointer-events-auto"
                        style={{
                          left: `${textPos.x}%`,
                          top: `${textPos.y}%`
                        }}
                      >
                        <span 
                          className={`font-black px-4 py-2 rounded-xl text-center backdrop-blur-md border inline-block transition-transform hover:scale-105 ${renderTextStyles(textColor, textBg).backgroundClass}`}
                          style={{ fontSize: `${textSize}px`, color: textColor }}
                        >
                          {imageOverlayText}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 flex flex-col items-center pointer-events-none">
                    <span className="text-3xl mb-2">✨</span>
                    <span className="text-xs font-extrabold text-white">Klikněte nebo přetáhněte fotku/video</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">✍️ Text do obsahu:</label>
                  <input
                    type="text"
                    placeholder="Napište text (lze přetahovat v náhledu)..."
                    value={imageOverlayText}
                    onChange={(e) => setImageOverlayText(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-violet-500 font-medium"
                  />
                </div>

                {imageOverlayText.trim() && (
                  <div className="space-y-2.5 pt-1 border-t border-slate-200/60">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">🎨 Barva textu:</label>
                      <div className="flex items-center gap-2">
                        {COLOR_PRESETS.map(c => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setTextColor(c)}
                            className={`w-6 h-6 rounded-full border-2 transition ${textColor === c ? 'scale-110 border-violet-600 ring-2 ring-violet-300' : 'border-slate-300'}`}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        <input
                          type="color"
                          value={textColor}
                          onChange={(e) => setTextColor(e.target.value)}
                          className="w-6 h-6 rounded border border-slate-300 cursor-pointer p-0 bg-transparent"
                          title="Vlastní barva"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">🖼️ Pozadí pod textem:</label>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setTextBg('black')}
                          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold border transition ${textBg === 'black' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          Černé
                        </button>
                        <button
                          type="button"
                          onClick={() => setTextBg('white')}
                          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold border transition ${textBg === 'white' ? 'bg-white text-slate-900 border-slate-900 shadow-sm' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          Bílé
                        </button>
                        <button
                          type="button"
                          onClick={() => setTextBg('transparent')}
                          className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-bold border transition ${textBg === 'transparent' ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-slate-700 border-slate-200'}`}
                        >
                          Žádné
                        </button>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-600">
                        <span>Velikost textu:</span>
                        <span>{textSize}px</span>
                      </div>
                      <input 
                        type="range" 
                        min="14" 
                        max="48" 
                        value={textSize} 
                        onChange={(e) => setTextSize(Number(e.target.value))}
                        className="w-full accent-violet-600 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>

              {createTab !== 'story' && (
                <>
                  <textarea
                    rows={2}
                    placeholder="Popis příspěvku..."
                    value={createCaption}
                    onChange={(e) => setCreateCaption(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none resize-none focus:border-violet-500"
                  />

                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Přidat lokaci..."
                      value={createLocation}
                      onChange={(e) => {
                        setCreateLocation(e.target.value)
                        setShowLocationSuggestions(true)
                      }}
                      onFocus={() => setShowLocationSuggestions(true)}
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 outline-none focus:border-violet-500"
                    />

                    {showLocationSuggestions && locationMatches.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-36 overflow-y-auto">
                        {locationMatches.map((loc, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setCreateLocation(loc)
                              setShowLocationSuggestions(false)
                            }}
                            className="p-2 text-xs text-slate-700 hover:bg-slate-100 hover:text-violet-600 cursor-pointer border-b border-slate-100 last:border-0 flex items-center gap-1.5"
                          >
                            <span>📍</span>
                            <span>{loc}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={resetCreateModal} className="px-3.5 py-2 text-xs text-slate-500 hover:text-slate-900 font-bold">Zrušit</button>
                <button type="submit" disabled={isUploading || previewItems.length === 0} className="px-4 py-2 text-xs font-extrabold bg-gradient-to-r from-violet-600 to-rose-500 text-white rounded-xl disabled:opacity-50 hover:opacity-90 transition shadow">
                  {isUploading ? 'Publikuji...' : 'Publikovat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Příspěvku Modal */}
      {selectedPostForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-3xl h-full max-h-[80vh] flex flex-col md:flex-row overflow-hidden border border-slate-200 shadow-2xl">
            <div className="relative flex-1 bg-slate-950 flex items-center justify-center overflow-hidden min-h-[250px]">
              {selectedPostForDetail.media[0]?.type === 'video' ? (
                <video src={selectedPostForDetail.media[0].url} autoPlay loop muted playsInline className="w-full h-full object-contain" />
              ) : (
                <img src={selectedPostForDetail.media[0]?.url} alt="" className="w-full h-full object-contain" />
              )}
            </div>

            <div className="w-full md:w-80 flex flex-col h-full bg-white border-l border-slate-200">
              <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200">
                    {selectedPostForDetail.user.avatar_url ? (
                      <img src={selectedPostForDetail.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold">{selectedPostForDetail.user.username[0]?.toUpperCase()}</span>
                    )}
                  </div>
                  <span className="text-xs font-black text-slate-900">{selectedPostForDetail.user.username}</span>
                </div>
                <button onClick={() => setSelectedPostForDetail(null)} className="text-slate-400 font-bold text-xs p-1">✕</button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3">
                {selectedPostForDetail.caption && (
                  <p className="text-xs text-slate-800 border-b border-slate-100 pb-3">
                    <span className="font-extrabold mr-1.5 text-slate-900">{selectedPostForDetail.user.username}</span>
                    {selectedPostForDetail.caption}
                  </p>
                )}
                {selectedPostForDetail.comments.map(c => (
                  <div key={c.id} className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <span className="font-extrabold text-slate-900 block">{c.user.username}</span>
                      <span className="text-slate-700">{c.text}</span>
                    </div>
                    {currentUser && (c.user_id === currentUser.id || currentUser.id !== 'guest') && (
                      <button onClick={() => handleDeleteComment(selectedPostForDetail.id, c.id)} className="text-slate-400 hover:text-rose-600 font-bold ml-2">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3.5 border-t border-slate-100 bg-slate-50 flex gap-2">
                <input
                  type="text"
                  placeholder="Komentovat..."
                  value={commentInput[selectedPostForDetail.id] || ''}
                  onChange={(e) => setCommentInput(prev => ({ ...prev, [selectedPostForDetail.id]: e.target.value }))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(selectedPostForDetail.id) }}
                  className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-violet-500"
                />
                <button
                  onClick={() => handleAddComment(selectedPostForDetail.id)}
                  className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white font-bold text-xs rounded-xl"
                >
                  Poslat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Komentáře Modal */}
      {selectedPostForComments && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-sm h-full max-h-[75vh] flex flex-col overflow-hidden border border-slate-200 shadow-2xl">
            <div className="p-3.5 border-b border-slate-100 flex justify-between items-center">
              <span className="font-extrabold text-xs text-slate-900">Komentáře ({selectedPostForComments.comments.length})</span>
              <button onClick={() => setSelectedPostForComments(null)} className="text-slate-400 font-bold text-xs p-1">✕</button>
            </div>

            <div className="flex-1 p-3 overflow-y-auto space-y-2">
              {selectedPostForComments.comments.map(c => (
                <div key={c.id} className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-slate-900 block">{c.user.username}</span>
                    <span className="text-slate-700">{c.text}</span>
                  </div>
                  {currentUser && (c.user_id === currentUser.id || currentUser.id !== 'guest') && (
                    <button onClick={() => handleDeleteComment(selectedPostForComments.id, c.id)} className="text-slate-400 hover:text-rose-600 font-bold ml-2">✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex gap-2">
              <input
                type="text"
                placeholder="Přidat komentář..."
                value={commentInput[selectedPostForComments.id] || ''}
                onChange={(e) => setCommentInput(prev => ({ ...prev, [selectedPostForComments.id]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(selectedPostForComments.id) }}
                className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:border-violet-500 flex-1"
              />
              <button
                onClick={() => handleAddComment(selectedPostForComments.id)}
                className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-rose-500 text-white font-bold text-xs rounded-xl"
              >
                Poslat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sdílení Modal */}
      {selectedPostForShare && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden border border-slate-200 shadow-2xl p-4 space-y-3">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="font-extrabold text-xs text-slate-900">Sdílet příspěvek</span>
              <button onClick={() => setSelectedPostForShare(null)} className="text-slate-400 font-bold text-xs p-1">✕</button>
            </div>

            <div className="space-y-2">
              <div 
                onClick={() => {
                  if (typeof window !== 'undefined') {
                    navigator.clipboard.writeText(`${window.location.origin}/domu#post-${selectedPostForShare.id}`)
                  }
                  showToast('Odkaz zkopírován do schránky!')
                  setSelectedPostForShare(null)
                }}
                className="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-xl cursor-pointer border border-slate-100 transition"
              >
                <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs">🔗</div>
                <div className="text-xs font-bold text-slate-800">Kopírovat odkaz</div>
              </div>
            </div>

            <button
              onClick={() => setSelectedPostForShare(null)}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-700 transition"
            >
              Zrušit
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}