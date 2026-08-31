'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

type CreateTab = 'post' | 'story' | 'reel'

interface Profile {
  id: string
  username: string
  full_name?: string
  avatar_url: string
  is_verified?: boolean
}

interface Comment {
  id: string
  user: Profile
  text: string
  created_at: string
}

interface PostMedia {
  url: string
  type: 'image' | 'video'
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

interface StoryItem {
  id: string
  media_url: string
  type: 'image' | 'video'
  created_at: string
  likes_count?: number
  is_liked?: boolean
}

interface UserStories {
  user: Profile
  stories: StoryItem[]
  has_unseen: boolean
}

interface NotificationItem {
  id: string
  user: Profile
  type: 'like' | 'follow' | 'comment'
  text: string
  created_at: string
  is_read: boolean
}

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

  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [storiesList, setStoriesList] = useState<UserStories[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Notifikace
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  // Modály
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<CreateTab>('post')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [previewItems, setPreviewItems] = useState<{ url: string; type: 'image' | 'video' }[]>([])
  const [createCaption, setCreateCaption] = useState('')
  const [createLocation, setCreateLocation] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // Stories Viewer
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null)
  const [activeStoryItemIndex, setActiveStoryItemIndex] = useState<number>(0)
  const [storyCommentInput, setStoryCommentInput] = useState('')

  // Interakce
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [doubleTapHeartPostId, setDoubleTapHeartPostId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const fetchFeedData = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      let activeUserProfile: Profile | null = null

      if (authUser) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .maybeSingle()

        activeUserProfile = {
          id: authUser.id,
          username: userProfile?.username || authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'moj_profil',
          full_name: userProfile?.full_name || authUser.user_metadata?.full_name || 'Uživatel',
          avatar_url: userProfile?.avatar_url || authUser.user_metadata?.avatar_url || '',
          is_verified: userProfile?.is_verified ?? false
        }
        setCurrentUser(activeUserProfile)
      } else {
        setCurrentUser({
          id: 'guest',
          username: 'host',
          avatar_url: ''
        })
      }

      // 1. Načtení Příspěvků a Reels
      const { data: rawPosts, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, media_url, media_type, caption, location, created_at')
        .order('created_at', { ascending: false })

      if (!postsError && rawPosts) {
        const userIds = Array.from(new Set(rawPosts.map(p => p.user_id).filter(Boolean)))
        const profilesMap = new Map<string, any>()

        if (userIds.length > 0) {
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, username, full_name, avatar_url, is_verified')
            .in('id', userIds)

          profilesData?.forEach(p => profilesMap.set(p.id, p))
        }

        const postIds = rawPosts.map(p => p.id)
        const [{ data: likesData }, { data: commentsData }] = await Promise.all([
          supabase.from('likes').select('post_id, user_id').in('post_id', postIds),
          supabase.from('comments').select('id, post_id, text, created_at, user_id').in('post_id', postIds)
        ])

        const commentUserIds = Array.from(new Set(commentsData?.map(c => c.user_id).filter(Boolean) || []))
        const commentProfilesMap = new Map<string, any>()

        if (commentUserIds.length > 0) {
          const { data: commentProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', commentUserIds)

          commentProfiles?.forEach(p => commentProfilesMap.set(p.id, p))
        }

        const formattedPosts: Post[] = rawPosts.map((p: any) => {
          let mediaArr: PostMedia[] = []
          try {
            const parsed = JSON.parse(p.media_url)
            mediaArr = Array.isArray(parsed) ? parsed : [{ url: p.media_url, type: p.media_type || 'image' }]
          } catch {
            mediaArr = [{ url: p.media_url, type: p.media_type || 'image' }]
          }

          let author = profilesMap.get(p.user_id)
          if (!author) {
            if (authUser && p.user_id === authUser.id && activeUserProfile) {
              author = activeUserProfile
            } else {
              author = {
                id: p.user_id || 'unknown',
                username: p.user_id ? `user_${p.user_id.substring(0, 5)}` : 'Uživatel',
                full_name: '',
                avatar_url: '',
                is_verified: false
              }
            }
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
            shares_count: Math.floor(Math.random() * 12) + 1,
            is_liked: authUser ? postLikes.some(l => l.user_id === authUser.id) : false,
            is_saved: false,
            comments: postComments.map((c: any) => {
              const cUser = commentProfilesMap.get(c.user_id) || { username: 'anonym', avatar_url: '' }
              return {
                id: c.id,
                user: {
                  id: c.user_id,
                  username: cUser.username || 'anonym',
                  avatar_url: cUser.avatar_url || ''
                },
                text: c.text,
                created_at: getRelativeTime(c.created_at)
              }
            }),
            created_at: getRelativeTime(p.created_at)
          }
        })

        setPosts(formattedPosts)
      }

      // 2. Načtení Stories
      const { data: rawStories } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type, created_at')
        .order('created_at', { ascending: true })

      if (rawStories && rawStories.length > 0) {
        const nowTime = Date.now()
        const twentyFourHours = 24 * 60 * 60 * 1000

        const storiesData = rawStories.filter((s: any) => {
          const storyTime = new Date(s.created_at).getTime()
          return (nowTime - storyTime) <= twentyFourHours
        })

        if (storiesData.length > 0) {
          const storyUserIds = Array.from(new Set(storiesData.map(s => s.user_id).filter(Boolean)))
          const storyProfilesMap = new Map<string, any>()

          if (storyUserIds.length > 0) {
            const { data: sProfiles } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', storyUserIds)

            sProfiles?.forEach(p => storyProfilesMap.set(p.id, p))
          }

          const groupedMap = new Map<string, UserStories>()
          storiesData.forEach((s: any) => {
            const uid = s.user_id || 'unknown'
            let sUser = storyProfilesMap.get(uid)
            if (!sUser) {
              if (authUser && uid === authUser.id && activeUserProfile) {
                sUser = activeUserProfile
              } else {
                sUser = { username: `user_${uid.substring(0, 5)}`, avatar_url: '' }
              }
            }

            if (!groupedMap.has(uid)) {
              groupedMap.set(uid, {
                user: {
                  id: uid,
                  username: sUser.username || 'Uživatel',
                  avatar_url: sUser.avatar_url || ''
                },
                stories: [],
                has_unseen: true
              })
            }
            groupedMap.get(uid)?.stories.push({
              id: s.id,
              media_url: s.media_url,
              type: s.media_type || 'image',
              created_at: s.created_at,
              likes_count: 0,
              is_liked: false
            })
          })

          setStoriesList(Array.from(groupedMap.values()))
        }
      }

      // 3. Načtení Reálných Upozornění
      if (activeUserProfile && activeUserProfile.id !== 'guest') {
        const myUserId = activeUserProfile.id
        const realNotifications: NotificationItem[] = []

        const { data: myPosts } = await supabase
          .from('posts')
          .select('id')
          .eq('user_id', myUserId)

        const myPostIds = myPosts?.map(p => p.id) || []

        if (myPostIds.length > 0) {
          const [{ data: realLikes }, { data: realComments }] = await Promise.all([
            supabase.from('likes').select('id, user_id, created_at').in('post_id', myPostIds).neq('user_id', myUserId).limit(10),
            supabase.from('comments').select('id, user_id, text, created_at').in('post_id', myPostIds).neq('user_id', myUserId).limit(10)
          ])

          const senderUserIds = Array.from(new Set([
            ...(realLikes?.map(l => l.user_id) || []),
            ...(realComments?.map(c => c.user_id) || [])
          ]))

          if (senderUserIds.length > 0) {
            const { data: senders } = await supabase
              .from('profiles')
              .select('id, username, avatar_url')
              .in('id', senderUserIds)

            const sendersMap = new Map(senders?.map(s => [s.id, s]))

            realLikes?.forEach(l => {
              const u = sendersMap.get(l.user_id)
              if (u) {
                realNotifications.push({
                  id: `like_${l.id}`,
                  user: u,
                  type: 'like',
                  text: 'dal(a) like vašemu příspěvku.',
                  created_at: getRelativeTime(l.created_at),
                  is_read: false
                })
              }
            })

            realComments?.forEach(c => {
              const u = sendersMap.get(c.user_id)
              if (u) {
                realNotifications.push({
                  id: `comment_${c.id}`,
                  user: u,
                  type: 'comment',
                  text: `napsal(a): "${c.text.length > 20 ? c.text.substring(0, 20) + '...' : c.text}"`,
                  created_at: getRelativeTime(c.created_at),
                  is_read: false
                })
              }
            })
          }
        }

        const { data: followers } = await supabase
          .from('follows')
          .select('id, follower_id, created_at')
          .eq('following_id', myUserId)
          .limit(10)

        if (followers && followers.length > 0) {
          const followerIds = followers.map(f => f.follower_id)
          const { data: fProfiles } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', followerIds)

          const fMap = new Map(fProfiles?.map(p => [p.id, p]))

          followers.forEach(f => {
            const u = fMap.get(f.follower_id)
            if (u) {
              realNotifications.push({
                id: `follow_${f.id}`,
                user: u,
                type: 'follow',
                text: 'vás začal(a) sledovat.',
                created_at: getRelativeTime(f.created_at),
                is_read: false
              })
            }
          })
        }

        setNotifications(realNotifications)
      }

    } catch (err) {
      console.error('Chyba při načítání feedu:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchFeedData()
  }, [fetchFeedData])

  // Posun na další Story
  const handleNextStory = useCallback(() => {
    if (activeStoryGroupIndex === null) return
    const currentGroup = storiesList[activeStoryGroupIndex]
    if (!currentGroup) return

    if (activeStoryItemIndex < currentGroup.stories.length - 1) {
      setActiveStoryItemIndex(prev => prev + 1)
      setStoryCommentInput('')
    } else {
      if (activeStoryGroupIndex < storiesList.length - 1) {
        setActiveStoryGroupIndex(prev => (prev !== null ? prev + 1 : null))
        setActiveStoryItemIndex(0)
        setStoryCommentInput('')
      } else {
        setActiveStoryGroupIndex(null)
      }
    }
  }, [activeStoryGroupIndex, activeStoryItemIndex, storiesList])

  // Posun na předchozí Story
  const handlePrevStory = useCallback(() => {
    if (activeStoryGroupIndex === null) return

    if (activeStoryItemIndex > 0) {
      setActiveStoryItemIndex(prev => prev - 1)
      setStoryCommentInput('')
    } else if (activeStoryGroupIndex > 0) {
      const prevGroupIndex = activeStoryGroupIndex - 1
      setActiveStoryGroupIndex(prevGroupIndex)
      setActiveStoryItemIndex(storiesList[prevGroupIndex]?.stories.length - 1 || 0)
      setStoryCommentInput('')
    }
  }, [activeStoryGroupIndex, activeStoryItemIndex, storiesList])

  useEffect(() => {
    if (activeStoryGroupIndex === null) return
    const timer = setTimeout(() => {
      handleNextStory()
    }, 5000)
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
    showToast(nextSaved ? 'Příspěvek uložen do sbírky' : 'Odebráno z uložených')
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_saved: nextSaved } : p))
  }

  const handleAddComment = async (postId: string) => {
    const text = commentInput[postId]?.trim()
    if (!text || !currentUser) return

    const newComment: Comment = {
      id: `temp_${Date.now()}`,
      user: currentUser,
      text,
      created_at: 'Právě teď'
    }

    setPosts(prev => prev.map(p => p.id === postId ? {
      ...p,
      comments: [...p.comments, newComment],
      comments_count: p.comments_count + 1
    } : p))

    setCommentInput(prev => ({ ...prev, [postId]: '' }))

    if (currentUser.id !== 'guest') {
      await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUser.id,
        text
      })
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadFiles(files)

    const items = files.map(file => ({
      url: URL.createObjectURL(file),
      type: file.type.startsWith('video') ? ('video' as const) : ('image' as const)
    }))
    setPreviewItems(items)
  }

  const resetCreateModal = () => {
    setIsCreateOpen(false)
    setUploadFiles([])
    setPreviewItems([])
    setCreateCaption('')
    setCreateLocation('')
  }

  const handlePublishContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!previewItems.length) return

    setIsUploading(true)
    try {
      const uploadedMediaUrls: PostMedia[] = []

      for (const file of uploadFiles) {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const bucketName = createTab === 'story' ? 'stories' : 'posts'

        const { error: uploadError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file)

        if (!uploadError) {
          const { data } = supabase.storage.from(bucketName).getPublicUrl(fileName)
          uploadedMediaUrls.push({
            url: data.publicUrl,
            type: file.type.startsWith('video') ? 'video' : 'image'
          })
        }
      }

      const mediaToSave = uploadedMediaUrls.length > 0
        ? uploadedMediaUrls
        : previewItems.map(item => ({ url: item.url, type: item.type }))

      if (createTab === 'story') {
        const { error } = await supabase.from('stories').insert({
          user_id: currentUser?.id !== 'guest' ? currentUser?.id : null,
          media_url: mediaToSave[0].url,
          media_type: mediaToSave[0].type
        })
        if (error) throw error
        showToast('✨ Příběh byl publikován!')
      } else {
        const isReel = createTab === 'reel' || mediaToSave[0].type === 'video'
        const { error } = await supabase.from('posts').insert({
          user_id: currentUser?.id !== 'guest' ? currentUser?.id : null,
          media_url: JSON.stringify(mediaToSave),
          media_type: isReel ? 'video' : mediaToSave.length > 1 ? 'carousel' : mediaToSave[0].type,
          caption: createCaption,
          location: createLocation || null
        })
        if (error) throw error
        showToast(isReel ? '🎬 Reel byl publikován!' : '📸 Příspěvek byl publikován!')
      }

      resetCreateModal()
      await fetchFeedData()
    } catch (err: any) {
      showToast(`Chyba: ${err.message || 'Nepodařilo se publikovat'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const activeGroup = activeStoryGroupIndex !== null ? storiesList[activeStoryGroupIndex] : null
  const activeStory = activeGroup ? activeGroup.stories[activeStoryItemIndex] : null

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      
      {/* NOTIFIKACE TOAST */}
      {toastMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-5 py-2.5 rounded-full text-xs font-bold shadow-xl border border-indigo-400/30 animate-bounce flex items-center gap-2">
          <span>✨</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HORNÍ NAVIGAČNÍ PANEL */}
      <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3 flex justify-end items-center shadow-sm relative">
        <div className="flex items-center gap-3">
          
          {/* VYTVOŘIT OBSAH */}
          <button
            onClick={() => { setCreateTab('post'); setIsCreateOpen(true); }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            <span>Vytvořit</span>
          </button>

          {/* SRDÍČKO - PRO NOTIFIKACE */}
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition border border-slate-200 cursor-pointer"
            title="Upozornění"
          >
            <svg className="w-5 h-5 text-rose-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {notifications.some(n => !n.is_read) && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white" />
            )}
          </button>

        </div>

        {/* OKNO NOTIFIKACÍ */}
        {isNotificationsOpen && (
          <div className="absolute right-4 top-16 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <span>❤️</span> Upozornění
              </h3>
              <button
                onClick={() => setIsNotificationsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {notifications.length === 0 ? (
                <div className="py-6 text-center text-slate-400 text-xs">
                  <span className="text-2xl block mb-1">📭</span>
                  Zatím žádné nové notifikace
                </div>
              ) : (
                notifications.map(n => (
                  <div key={n.id} className="flex items-center gap-3 text-xs p-2 hover:bg-slate-50 rounded-xl transition">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-indigo-600 shrink-0 overflow-hidden">
                      {n.user.avatar_url ? (
                        <img src={n.user.avatar_url} alt={n.user.username} className="w-full h-full object-cover" />
                      ) : (
                        <span>{n.user.username[0]?.toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <span className="font-bold text-slate-900">{n.user.username}</span>{' '}
                      <span className="text-slate-600">{n.text}</span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">{n.created_at}</span>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </header>

      {/* HLAVNÍ OBSAH */}
      <main className="flex-1 w-full px-3 sm:px-6 md:px-8 py-5 pb-24 max-w-7xl mx-auto flex flex-col items-center">
        
        {/* STORIES BAR */}
        <section className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 p-4 mb-6 shadow-sm overflow-x-auto no-scrollbar">
          <div className="flex gap-4 items-center min-w-max">
            
            {/* OTEVŘENÍ MODÁLU PRO PŘIDÁNÍ STORY */}
            <div
              onClick={() => { setCreateTab('story'); setIsCreateOpen(true); }}
              className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0"
            >
              <div className="relative w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-indigo-500/60 group-hover:border-indigo-600 group-hover:scale-105 transition-all bg-white flex items-center justify-center">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Váš profil" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl">👤</span>
                )}
                <div className="absolute bottom-0 right-0 bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-black border-2 border-white shadow">
                  +
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-500 truncate max-w-[72px]">Váš příběh</span>
            </div>

            {/* SEZNAM UŽIVATELSKÝCH STORIES K OTEVŘENÍ */}
            {storiesList.map((storyGroup, sIdx) => (
              <div
                key={storyGroup.user.id}
                onClick={() => {
                  setActiveStoryGroupIndex(sIdx)
                  setActiveStoryItemIndex(0)
                }}
                className="flex flex-col items-center gap-2 cursor-pointer group flex-shrink-0"
              >
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-indigo-500 transition-transform group-hover:scale-105 shadow-sm">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-slate-100 flex items-center justify-center">
                    {storyGroup.user.avatar_url ? (
                      <img src={storyGroup.user.avatar_url} alt={storyGroup.user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">👤</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-700 truncate max-w-[72px]">{storyGroup.user.username}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FEED PŘÍSPĚVKŮ A REELS */}
        {isLoading ? (
          <div className="w-full max-w-2xl flex flex-col gap-6 py-4">
            {[1, 2].map(n => (
              <div key={n} className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm animate-pulse h-[500px]" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="w-full max-w-2xl bg-white rounded-3xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm my-8">
            <span className="text-4xl block mb-3">📭</span>
            <p className="text-base font-bold text-slate-900 mb-1">Žádné příspěvky k zobrazení</p>
            <p className="text-xs text-slate-500">Buďte první, kdo sdílí nový moment nebo video Reel!</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col gap-6">
            {posts.map(post => {
              const currentMedia = post.media[0]

              return (
                <article key={post.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden w-full">
                  
                  {/* AUTOR PŘÍSPĚVKU */}
                  <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {post.user.avatar_url ? (
                          <img src={post.user.avatar_url} alt={post.user.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">👤</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{post.user.username}</span>
                          <span className="text-slate-400 text-[11px]">• {post.created_at}</span>
                        </div>
                        {post.location && <span className="text-[10px] text-indigo-600 font-medium block">{post.location}</span>}
                      </div>
                    </div>
                    <button onClick={() => showToast('Možnosti příspěvku')} className="text-slate-400 hover:text-slate-700 p-1 text-base cursor-pointer">
                      •••
                    </button>
                  </div>

                  {/* OBSAH (FOTO / VIDEO REEL) */}
                  <div
                    className="relative bg-black aspect-square w-full overflow-hidden select-none flex items-center justify-center cursor-pointer"
                    onDoubleClick={() => {
                      if (!post.is_liked) handleToggleLike(post.id)
                      setDoubleTapHeartPostId(post.id)
                      setTimeout(() => setDoubleTapHeartPostId(null), 900)
                    }}
                  >
                    {currentMedia?.type === 'video' ? (
                      <video
                        src={currentMedia.url}
                        controls
                        autoPlay
                        loop
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img src={currentMedia?.url} alt="Příspěvek" className="w-full h-full object-cover" />
                    )}

                    {doubleTapHeartPostId === post.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-ping pointer-events-none">
                        <span className="text-7xl text-rose-500 drop-shadow-2xl">❤️</span>
                      </div>
                    )}
                  </div>

                  {/* INTERAKCE A POPIS */}
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-4 text-xl">
                        <button onClick={() => handleToggleLike(post.id)} className="transition active:scale-125 cursor-pointer">
                          {post.is_liked ? '❤️' : '🤍'}
                        </button>
                        <button onClick={() => showToast('💬 Napište komentář níže')} className="transition hover:opacity-75 cursor-pointer">
                          💬
                        </button>
                        <button onClick={() => showToast('🚀 Příspěvek nasdílen')} className="transition hover:opacity-75 cursor-pointer">
                          🚀
                        </button>
                      </div>

                      <button onClick={() => handleToggleSave(post.id)} className="text-xl transition active:scale-110 cursor-pointer">
                        {post.is_saved ? '🔖' : '🏷️'}
                      </button>
                    </div>

                    <div className="text-xs font-bold text-slate-900 mb-2">
                      {post.likes_count} To se líbí
                    </div>

                    {post.caption && (
                      <div className="text-xs text-slate-800 mb-3 leading-relaxed">
                        <span className="font-bold text-slate-900 mr-2">{post.user.username}</span>
                        {post.caption}
                      </div>
                    )}

                    {/* KOMENTÁŘE */}
                    {post.comments.length > 0 && (
                      <div className="space-y-1.5 mb-3 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                        {post.comments.slice(-3).map(c => (
                          <div key={c.id} className="text-xs flex items-start gap-2">
                            <span className="font-bold text-slate-900 shrink-0">{c.user.username}:</span>
                            <span className="text-slate-700 flex-1 break-words">{c.text}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">{c.created_at}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* FORMULÁŘ PRO PŘIDÁNÍ KOMENTÁŘE */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        handleAddComment(post.id)
                      }}
                      className="flex items-center gap-2 pt-2 border-t border-slate-100"
                    >
                      <input
                        type="text"
                        placeholder="Přidat komentář..."
                        value={commentInput[post.id] || ''}
                        onChange={(e) => setCommentInput({ ...commentInput, [post.id]: e.target.value })}
                        className="flex-1 bg-slate-100 hover:bg-slate-200/60 focus:bg-white text-xs px-3.5 py-2 rounded-xl outline-none border border-transparent focus:border-indigo-300 transition"
                      />
                      <button
                        type="submit"
                        disabled={!commentInput[post.id]?.trim()}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-40 px-2 py-1 transition cursor-pointer"
                      >
                        Zveřejnit
                      </button>
                    </form>
                  </div>

                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* OPRAVENÝ STORIES VIEWER (PROHLÍŽEČ STORIES) */}
      {activeGroup && activeStory && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4">
          <div className="relative w-full max-w-md h-full sm:h-[90vh] sm:rounded-3xl bg-black overflow-hidden flex flex-col justify-between shadow-2xl border border-slate-800">
            
            {/* OBRÁZEK / VIDEO PŘÍBĚHU - UMÍSTĚNÍ V POZADÍ */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
              {activeStory.type === 'video' ? (
                <video
                  key={activeStory.id}
                  src={activeStory.media_url}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <img
                  key={activeStory.id}
                  src={activeStory.media_url}
                  alt="Story"
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            {/* DOTYKOVÉ ZÓNY PRO PROKLIKÁVÁNÍ (VLEVO / VPRAVO) */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
              onClick={handlePrevStory}
            />
            <div
              className="absolute right-0 top-0 bottom-0 w-2/3 z-20 cursor-pointer"
              onClick={handleNextStory}
            />

            {/* PROGRESS BAR */}
            <div className="absolute top-3 left-3 right-3 z-30 flex gap-1.5 pointer-events-none">
              {activeGroup.stories.map((story, idx) => (
                <div key={story.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
                  <div
                    className={`h-full bg-white transition-all duration-300 ${
                      idx < activeStoryItemIndex
                        ? 'w-full'
                        : idx === activeStoryItemIndex
                        ? 'w-full animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* HLAVIČKA STORY */}
            <div className="absolute top-6 left-3 right-3 z-30 flex justify-between items-center text-white pointer-events-auto">
              <div className="flex items-center gap-2.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30 bg-slate-800">
                  {activeGroup.user.avatar_url ? (
                    <img
                      src={activeGroup.user.avatar_url}
                      alt={activeGroup.user.username}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                  )}
                </div>
                <span className="text-xs font-bold">{activeGroup.user.username}</span>
                <span className="text-[10px] text-white/60">
                  {getRelativeTime(activeStory.created_at)}
                </span>
              </div>

              <button
                onClick={() => setActiveStoryGroupIndex(null)}
                className="w-8 h-8 rounded-full bg-black/50 hover:bg-black/80 flex items-center justify-center text-white text-sm font-bold border border-white/20 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* SPODNÍ REAKCE NA STORY */}
            <div className="absolute bottom-4 left-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
              <input
                type="text"
                placeholder={`Odpovědět uživateli ${activeGroup.user.username}...`}
                value={storyCommentInput}
                onChange={(e) => setStoryCommentInput(e.target.value)}
                className="flex-1 bg-black/60 backdrop-blur-md text-white placeholder-white/60 text-xs px-4 py-3 rounded-full border border-white/20 outline-none focus:border-white/50 transition"
              />
              <button
                onClick={() => {
                  if (storyCommentInput.trim()) {
                    showToast('Odpověď odeslána!')
                    setStoryCommentInput('')
                  }
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-4 py-3 rounded-full transition shadow-lg cursor-pointer"
              >
                Odeslat
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODÁL PRO VYTVOŘENÍ OBSAHU */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>✨</span> Vytvořit nový obsah
              </h2>
              <button
                onClick={resetCreateModal}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-slate-100 bg-slate-50 p-1.5 gap-1.5">
              <button
                type="button"
                onClick={() => setCreateTab('post')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  createTab === 'post'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                📸 Příspěvek
              </button>
              <button
                type="button"
                onClick={() => setCreateTab('story')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  createTab === 'story'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ⚡ Příběh
              </button>
              <button
                type="button"
                onClick={() => setCreateTab('reel')}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
                  createTab === 'reel'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🎬 Reel
              </button>
            </div>

            <form onSubmit={handlePublishContent} className="p-6 space-y-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={createTab === 'reel' ? 'video/*' : 'image/*,video/*'}
                  multiple={createTab === 'post'}
                  onChange={handleFileChange}
                  className="hidden"
                />

                {previewItems.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-48 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-slate-100/70 transition flex flex-col items-center justify-center gap-2 cursor-pointer group"
                  >
                    <span className="text-3xl group-hover:scale-110 transition-transform">📁</span>
                    <p className="text-xs font-bold text-slate-700">Vyberte fotky nebo videa</p>
                    <p className="text-[10px] text-slate-400">
                      {createTab === 'story'
                        ? 'Nahrát fotku/video pro Story (24 hod)'
                        : createTab === 'reel'
                        ? 'Nahrát krátké video (Reel)'
                        : 'Nahrát 1 nebo více souborů pro příspěvek'}
                    </p>
                  </div>
                ) : (
                  <div className="relative w-full h-56 rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-slate-200">
                    {previewItems[0].type === 'video' ? (
                      <video src={previewItems[0].url} controls className="w-full h-full object-cover" />
                    ) : (
                      <img src={previewItems[0].url} alt="Náhled" className="w-full h-full object-cover" />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setUploadFiles([])
                        setPreviewItems([])
                      }}
                      className="absolute top-3 right-3 bg-black/70 hover:bg-black text-white text-xs px-2.5 py-1 rounded-full backdrop-blur-md border border-white/20 font-bold transition cursor-pointer"
                    >
                      Změnit
                    </button>
                  </div>
                )}
              </div>

              {createTab !== 'story' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Popisek</label>
                    <textarea
                      rows={3}
                      placeholder="Napište popisek k příspěvku..."
                      value={createCaption}
                      onChange={(e) => setCreateCaption(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Lokalita (volitelné)</label>
                    <input
                      type="text"
                      placeholder="např. Praha, Česká republika"
                      value={createLocation}
                      onChange={(e) => setCreateLocation(e.target.value)}
                      className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:border-indigo-500 outline-none transition"
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={resetCreateModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={previewItems.length === 0 || isUploading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 disabled:opacity-50 transition cursor-pointer flex items-center gap-2"
                >
                  {isUploading ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Publikuji...</span>
                    </>
                  ) : (
                    <span>Zveřejnit</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SPODNÍ NAVIGAČNÍ PANEL */}
      <BottomNav />
    </div>
  )
}