'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

// ==========================================
// TYPES & INTERFACES
// ==========================================

type MediaType = 'image' | 'video' | 'carousel'
type CreateTab = 'post' | 'story' | 'reel'

interface Profile {
  id: string
  username: string
  full_name?: string
  avatar_url: string
  is_verified?: boolean
  has_story?: boolean
}

interface CommentReply {
  id: string
  user: Profile
  text: string
  created_at: string
  likes_count: number
  is_liked: boolean
}

interface Comment {
  id: string
  user: Profile
  text: string
  created_at: string
  likes_count: number
  is_liked: boolean
  replies?: CommentReply[]
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
  audio_title?: string
  likes_count: number
  comments_count: number
  shares_count: number
  is_liked: boolean
  is_saved: boolean
  is_muted?: boolean
  comments: Comment[]
  created_at: string
}

interface StoryItem {
  id: string
  media_url: string
  type: 'image' | 'video'
  duration: number
  created_at: string
}

interface UserStories {
  user: Profile
  stories: StoryItem[]
  has_unseen: boolean
}

interface NotificationItem {
  id: string
  user: Profile
  type: 'like' | 'comment' | 'follow' | 'mention'
  post_media?: string
  created_at: string
  is_read: boolean
}

// ==========================================
// MAIN COMPONENT
// ==========================================

export default function InstagramHomeFull() {
  const router = useRouter()
  const supabase = createClient()

  // State: Data
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [storiesList, setStoriesList] = useState<UserStories[]>([])
  const [suggestions, setSuggestions] = useState<Profile[]>([])
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // State: UI & Navigation Modals
  const [activeTab, setActiveTab] = useState<'feed' | 'reels'>('feed')
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(3)
  const [activePostMenu, setActivePostMenu] = useState<Post | null>(null)
  const [activeShareModal, setActiveShareModal] = useState<Post | null>(null)
  const [activeCommentsModal, setActiveCommentsModal] = useState<Post | null>(null)
  
  // State: Story Viewer
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null)
  const [activeStoryItemIndex, setActiveStoryItemIndex] = useState<number>(0)
  const [storyProgress, setStoryProgress] = useState<number>(0)
  const [isStoryPaused, setIsStoryPaused] = useState<boolean>(false)

  // State: Create Content Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<CreateTab>('post')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [createCaption, setCreateCaption] = useState('')
  const [createLocation, setCreateLocation] = useState('')
  const [createAudioTitle, setCreateAudioTitle] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [currentCarouselIndex, setCurrentCarouselIndex] = useState<Record<string, number>>({})

  // State: Interactive Elements
  const [commentInput, setCommentInput] = useState<Record<string, string>>({})
  const [modalCommentInput, setModalCommentInput] = useState('')
  const [doubleTapHeartPostId, setDoubleTapHeartPostId] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [volumeMuted, setVolumeMuted] = useState<boolean>(true)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ------------------------------------------
  // INITIAL DATA FETCHING (SUPABASE)
  // ------------------------------------------

  const fetchFeedData = useCallback(async () => {
    setIsLoading(true)
    try {
      // 1. Fetch authenticated user
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      let profileData: Profile = {
        id: authUser?.id || 'guest',
        username: authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || 'moj_profil',
        full_name: authUser?.user_metadata?.full_name || 'Uživatel PawMeet',
        avatar_url: authUser?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
        is_verified: true
      }
      setCurrentUser(profileData)

      // 2. Fetch Posts from Supabase
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          caption,
          location,
          audio_title,
          likes_count,
          comments_count,
          created_at,
          profiles ( id, username, full_name, avatar_url, is_verified ),
          comments (
            id,
            text,
            created_at,
            likes_count,
            profiles ( id, username, avatar_url )
          ),
          likes ( user_id ),
          saved_posts ( user_id )
        `)
        .order('created_at', { ascending: false })

      if (!postsError && postsData && postsData.length > 0) {
        const formattedPosts: Post[] = postsData.map((p: any) => {
          let mediaArr: PostMedia[] = []
          try {
            const parsed = JSON.parse(p.media_url)
            mediaArr = Array.isArray(parsed) ? parsed : [{ url: p.media_url, type: p.media_type || 'image' }]
          } catch {
            mediaArr = [{ url: p.media_url, type: p.media_type || 'image' }]
          }

          return {
            id: p.id,
            user_id: p.user_id,
            user: {
              id: p.profiles?.id || p.user_id,
              username: p.profiles?.username || 'user',
              full_name: p.profiles?.full_name || '',
              avatar_url: p.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
              is_verified: p.profiles?.is_verified || false
            },
            media: mediaArr,
            caption: p.caption || '',
            location: p.location,
            audio_title: p.audio_title || 'Originální zvuk',
            likes_count: p.likes_count || p.likes?.length || 0,
            comments_count: p.comments_count || p.comments?.length || 0,
            shares_count: Math.floor(Math.random() * 45),
            is_liked: authUser ? p.likes?.some((l: any) => l.user_id === authUser.id) : false,
            is_saved: authUser ? p.saved_posts?.some((s: any) => s.user_id === authUser.id) : false,
            comments: p.comments?.map((c: any) => ({
              id: c.id,
              user: {
                id: c.profiles?.id,
                username: c.profiles?.username || 'anonym',
                avatar_url: c.profiles?.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'
              },
              text: c.text,
              created_at: new Date(c.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              likes_count: c.likes_count || 0,
              is_liked: false
            })) || [],
            created_at: getRelativeTime(p.created_at)
          }
        })
        setPosts(formattedPosts)
      } else {
        // Fallback Mock Feed (Instagram standard visuals)
        setPosts(getMockPosts(profileData))
      }

      // 3. Fetch Stories from Supabase
      const { data: storiesData } = await supabase
        .from('stories')
        .select(`
          id,
          media_url,
          media_type,
          created_at,
          profiles ( id, username, avatar_url )
        `)
        .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })

      if (storiesData && storiesData.length > 0) {
        // Group stories by user
        const groupedMap = new Map<string, UserStories>()
        storiesData.forEach((s: any) => {
          const uid = s.profiles?.id || 'unknown'
          if (!groupedMap.has(uid)) {
            groupedMap.set(uid, {
              user: {
                id: uid,
                username: s.profiles?.username || 'Uživatel',
                avatar_url: s.profiles?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
              },
              stories: [],
              has_unseen: true
            })
          }
          groupedMap.get(uid)?.stories.push({
            id: s.id,
            media_url: s.media_url,
            type: s.media_type || 'image',
            duration: 5,
            created_at: s.created_at
          })
        })
        setStoriesList(Array.from(groupedMap.values()))
      } else {
        setStoriesList(getMockStories())
      }

      // 4. Mock Suggestions & Notifications
      setSuggestions(getMockSuggestions())
      setNotifications(getMockNotifications())

    } catch (err) {
      console.error("Supabase fetch error:", err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchFeedData()
  }, [fetchFeedData])

  // Realtime Subscription to New Posts
  useEffect(() => {
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, payload => {
        showToast('🔥 Nový příspěvek byl právě publikován!')
        fetchFeedData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, fetchFeedData])

  // Helper Toast
  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // ------------------------------------------
  // INTERACTION HANDLERS
  // ------------------------------------------

  const handleToggleLike = async (postId: string) => {
    setPosts(prev => prev.map(post => {
      if (post.id === postId) {
        const nextState = !post.is_liked
        return {
          ...post,
          is_liked: nextState,
          likes_count: nextState ? post.likes_count + 1 : Math.max(0, post.likes_count - 1)
        }
      }
      return post
    }))

    if (currentUser && currentUser.id !== 'guest') {
      const target = posts.find(p => p.id === postId)
      if (target?.is_liked) {
        await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', currentUser.id)
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id })
      }
    }
  }

  const handleDoubleTap = (postId: string) => {
    const post = posts.find(p => p.id === postId)
    if (post && !post.is_liked) {
      handleToggleLike(postId)
    }
    setDoubleTapHeartPostId(postId)
    setTimeout(() => setDoubleTapHeartPostId(null), 900)
  }

  const handleToggleSave = async (postId: string) => {
    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        const nextSaved = !p.is_saved
        showToast(nextSaved ? 'Příspěvek uložen do sbírky' : 'Příspěvek odebrán z uložených')
        return { ...p, is_saved: nextSaved }
      }
      return p
    }))

    if (currentUser && currentUser.id !== 'guest') {
      const target = posts.find(p => p.id === postId)
      if (target?.is_saved) {
        await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', currentUser.id)
      } else {
        await supabase.from('saved_posts').insert({ post_id: postId, user_id: currentUser.id })
      }
    }
  }

  const handleAddComment = async (postId: string, textOverride?: string) => {
    const text = textOverride || commentInput[postId]?.trim()
    if (!text || !currentUser) return

    const newCommentObj: Comment = {
      id: `temp_${Date.now()}`,
      user: currentUser,
      text,
      created_at: 'Právě teď',
      likes_count: 0,
      is_liked: false
    }

    setPosts(prev => prev.map(p => {
      if (p.id === postId) {
        return {
          ...p,
          comments: [...p.comments, newCommentObj],
          comments_count: p.comments_count + 1
        }
      }
      return p
    }))

    setCommentInput(prev => ({ ...prev, [postId]: '' }))
    setModalCommentInput('')

    if (currentUser.id !== 'guest') {
      await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUser.id,
        text
      })
    }
  }

  // Carousel navigation
  const nextCarouselMedia = (postId: string, max: number) => {
    setCurrentCarouselIndex(prev => ({
      ...prev,
      [postId]: Math.min((prev[postId] || 0) + 1, max - 1)
    }))
  }

  const prevCarouselMedia = (postId: string) => {
    setCurrentCarouselIndex(prev => ({
      ...prev,
      [postId]: Math.max((prev[postId] || 0) - 1, 0)
    }))
  }

  // File Upload Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadFiles(files)
    const urls = files.map(file => URL.createObjectURL(file))
    setPreviewUrls(urls)
  }

  const handlePublishContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!previewUrls.length) return

    setIsUploading(true)
    try {
      const uploadedMediaUrls: PostMedia[] = []

      // Upload to Supabase Storage if files exist
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

      // Fallback if direct blob preview was used without file selection
      if (!uploadedMediaUrls.length && previewUrls.length) {
        previewUrls.forEach(url => uploadedMediaUrls.push({ url, type: 'image' }))
      }

      if (createTab === 'story') {
        // Insert into Stories
        const { error } = await supabase.from('stories').insert({
          user_id: currentUser?.id,
          media_url: uploadedMediaUrls[0].url,
          media_type: uploadedMediaUrls[0].type
        })
        if (error) throw error

        showToast('🎉 Příběh byl přidán!')
      } else {
        // Insert into Posts
        const { data: newPostData, error } = await supabase.from('posts').insert({
          user_id: currentUser?.id,
          media_url: JSON.stringify(uploadedMediaUrls),
          media_type: uploadedMediaUrls.length > 1 ? 'carousel' : uploadedMediaUrls[0].type,
          caption: createCaption,
          location: createLocation || null,
          audio_title: createAudioTitle || 'Původní zvuk'
        }).select().single()

        if (error) throw error
        showToast('✨ Příspěvek byl úspěšně sdílen!')
      }

      // Reset state & close
      setIsCreateOpen(false)
      setUploadFiles([])
      setPreviewUrls([])
      setCreateCaption('')
      setCreateLocation('')
      setCreateAudioTitle('')
      fetchFeedData()
    } catch (err: any) {
      showToast(`Chyba při nahrávání: ${err.message || 'Nepodařilo se publikovat'}`)
    } finally {
      setIsUploading(false)
    }
  }

  // STORY TIMER AUTO-ADVANCE
  useEffect(() => {
    if (activeStoryGroupIndex === null || isStoryPaused) return

    const timer = setInterval(() => {
      setStoryProgress(prev => {
        if (prev >= 100) {
          // Advance to next story item or group
          const currentGroup = storiesList[activeStoryGroupIndex]
          if (activeStoryItemIndex < currentGroup.stories.length - 1) {
            setActiveStoryItemIndex(i => i + 1)
            return 0
          } else if (activeStoryGroupIndex < storiesList.length - 1) {
            setActiveStoryGroupIndex(g => g + 1)
            setActiveStoryItemIndex(0)
            return 0
          } else {
            setActiveStoryGroupIndex(null)
            return 0
          }
        }
        return prev + 2
      })
    }, 100)

    return () => clearInterval(timer)
  }, [activeStoryGroupIndex, activeStoryItemIndex, isStoryPaused, storiesList])

  // ------------------------------------------
  // RENDER UI
  // ------------------------------------------

  return (
    <div className="min-h-screen w-screen bg-black text-white font-sans antialiased selection:bg-pink-500 selection:text-white flex justify-center">

      {/* MAIN CONTAINER (FULLSCREEN RESPONSIVE MAX-WIDTH GRID) */}
      <div className="w-full max-w-[1280px] min-h-screen flex flex-col md:flex-row justify-between">
        
        {/* ================================================= */}
        {/* LEFT SIDEBAR NAVIGATION (DESKTOP) & TOP HEADER (MOBILE) */}
        {/* ================================================= */}
        
        {/* MOBILE TOP HEADER */}
        <header className="md:hidden sticky top-0 z-40 w-full bg-black/90 backdrop-blur-md border-b border-neutral-800 px-4 py-3 flex justify-between items-center">
          <Link href="/" className="text-2xl font-black tracking-tighter bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 bg-clip-text text-transparent">
            Instagram
          </Link>
          <div className="flex items-center gap-4">
            <button onClick={() => setIsCreateOpen(true)} className="hover:opacity-70 transition">
              <PlusSquareIcon className="w-6 h-6" />
            </button>
            <button onClick={() => setIsNotificationsOpen(!isNotificationsOpen)} className="relative hover:opacity-70 transition">
              <HeartIcon className="w-6 h-6" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-rose-600 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>
            <button onClick={() => router.push('/chat')} className="hover:opacity-70 transition">
              <DirectIcon className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* DESKTOP LEFT SIDEBAR */}
        <aside className="hidden md:flex flex-col w-[240px] xl:w-[280px] h-screen sticky top-0 border-r border-neutral-800 px-4 py-6 justify-between z-30 bg-black">
          <div className="flex flex-col gap-8">
            <Link href="/" className="px-3 pt-2">
              <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-amber-400 via-rose-500 to-purple-600 bg-clip-text text-transparent">
                Instagram
              </h1>
            </Link>

            <nav className="flex flex-col gap-1">
              <NavItem icon={<HomeIcon className="w-6 h-6" />} label="Domů" active />
              <NavItem icon={<SearchIcon className="w-6 h-6" />} label="Hledat" />
              <NavItem icon={<ExploreIcon className="w-6 h-6" />} label="Objevovat" />
              <NavItem icon={<ReelsIcon className="w-6 h-6" />} label="Reels" />
              <NavItem icon={<DirectIcon className="w-6 h-6" />} label="Zprávy" badge={4} />
              <NavItem
                icon={<HeartIcon className="w-6 h-6" />}
                label="Upozornění"
                badge={unreadNotificationsCount}
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              />
              <NavItem
                icon={<PlusSquareIcon className="w-6 h-6" />}
                label="Vytvořit"
                onClick={() => setIsCreateOpen(true)}
              />
              <NavItem
                icon={
                  <img src={currentUser?.avatar_url} className="w-6 h-6 rounded-full object-cover border border-neutral-700" />
                }
                label="Profil"
              />
            </nav>
          </div>

          <div className="flex flex-col gap-2">
            <NavItem icon={<MenuIcon className="w-6 h-6" />} label="Více" />
          </div>
        </aside>

        {/* ================================================= */}
        {/* CENTER FEED CONTENT */}
        {/* ================================================= */}
        <main className="flex-1 max-w-[630px] mx-auto w-full pt-2 pb-20 md:pb-8 px-0 sm:px-4">
          
          {/* STORIES BAR */}
          <section className="bg-black border-b border-neutral-800 md:border md:rounded-2xl p-4 mb-4 overflow-x-auto no-scrollbar">
            <div className="flex gap-4 items-center min-w-max">
              {/* Add Story Button */}
              <div
                onClick={() => { setCreateTab('story'); setIsCreateOpen(true); }}
                className="flex flex-col items-center gap-1.5 cursor-pointer group"
              >
                <div className="relative w-16 h-16 rounded-full border-2 border-dashed border-rose-500 flex items-center justify-center bg-neutral-900 group-hover:scale-105 transition-transform">
                  <img src={currentUser?.avatar_url} className="w-full h-full rounded-full object-cover opacity-60" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-indigo-600 text-white rounded-full p-1 shadow-lg">+</span>
                  </div>
                </div>
                <span className="text-[11px] font-medium text-neutral-400 truncate max-w-[72px]">Váš příběh</span>
              </div>

              {/* Stories List */}
              {storiesList.map((storyGroup, gIndex) => (
                <div
                  key={storyGroup.user.id}
                  onClick={() => {
                    setActiveStoryGroupIndex(gIndex)
                    setActiveStoryItemIndex(0)
                    setStoryProgress(0)
                  }}
                  className="flex flex-col items-center gap-1.5 cursor-pointer group"
                >
                  <div className={`p-[2.5px] rounded-full transition-transform group-hover:scale-105 ${
                    storyGroup.has_unseen ? 'bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600' : 'bg-neutral-800'
                  }`}>
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-black bg-neutral-900">
                      <img src={storyGroup.user.avatar_url} alt={storyGroup.user.username} className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-300 truncate max-w-[72px]">
                    {storyGroup.user.username}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* MAIN POSTS FEED */}
          {isLoading ? (
            <div className="flex flex-col gap-6 py-8">
              {[1, 2].map(n => (
                <div key={n} className="bg-neutral-900/50 rounded-2xl p-4 border border-neutral-800 animate-pulse h-[500px]" />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {posts.map(post => {
                const carouselIdx = currentCarouselIndex[post.id] || 0
                const currentMedia = post.media[carouselIdx] || post.media[0]

                return (
                  <article key={post.id} className="bg-black sm:bg-neutral-950 sm:border sm:border-neutral-800/80 sm:rounded-2xl overflow-hidden">
                    
                    {/* Post Header */}
                    <div className="flex justify-between items-center p-3.5 border-b border-neutral-900">
                      <div className="flex items-center gap-3">
                        <div className="p-[2px] rounded-full bg-gradient-to-tr from-amber-500 to-purple-600">
                          <img src={post.user.avatar_url} alt={post.user.username} className="w-8 h-8 rounded-full object-cover border border-black" />
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-white hover:underline cursor-pointer">{post.user.username}</span>
                            {post.user.is_verified && <VerifiedBadge className="w-3.5 h-3.5 text-blue-500" />}
                            <span className="text-neutral-500 text-xs">• {post.created_at}</span>
                          </div>
                          {post.location && (
                            <span className="text-[10px] text-neutral-400 block -mt-0.5">{post.location}</span>
                          )}
                        </div>
                      </div>

                      <button onClick={() => setActivePostMenu(post)} className="text-neutral-400 hover:text-white p-1">
                        <DotsHorizontalIcon className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Post Media Viewer */}
                    <div
                      className="relative bg-neutral-950 aspect-square w-full overflow-hidden select-none flex items-center justify-center cursor-pointer group"
                      onDoubleClick={() => handleDoubleTap(post.id)}
                    >
                      {currentMedia?.type === 'video' ? (
                        <video
                          src={currentMedia.url}
                          autoPlay
                          loop
                          muted={volumeMuted}
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <img src={currentMedia?.url} alt="Media" className="w-full h-full object-cover" />
                      )}

                      {/* Double Tap Heart Animation Overlay */}
                      {doubleTapHeartPostId === post.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] animate-ping">
                          <HeartIcon className="w-28 h-28 text-rose-500 fill-rose-500 drop-shadow-2xl" />
                        </div>
                      )}

                      {/* Carousel Controls */}
                      {post.media.length > 1 && (
                        <>
                          {carouselIdx > 0 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); prevCarouselMedia(post.id); }}
                              className="absolute left-3 bg-black/60 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-md"
                            >
                              ‹
                            </button>
                          )}
                          {carouselIdx < post.media.length - 1 && (
                            <button
                              onClick={(e) => { e.stopPropagation(); nextCarouselMedia(post.id, post.media.length); }}
                              className="absolute right-3 bg-black/60 hover:bg-black text-white p-1.5 rounded-full backdrop-blur-md"
                            >
                              ›
                            </button>
                          )}
                          {/* Carousel Dots Indicator */}
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {post.media.map((_, idx) => (
                              <div
                                key={idx}
                                className={`w-1.5 h-1.5 rounded-full transition-all ${
                                  idx === carouselIdx ? 'bg-white w-3' : 'bg-white/40'
                                }`}
                              />
                            ))}
                          </div>
                        </>
                      )}

                      {/* Video Sound Toggle */}
                      {currentMedia?.type === 'video' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setVolumeMuted(!volumeMuted); }}
                          className="absolute bottom-3 right-3 bg-black/70 p-2 rounded-full text-white text-xs"
                        >
                          {volumeMuted ? '🔇' : '🔊'}
                        </button>
                      )}
                    </div>

                    {/* Post Action Buttons */}
                    <div className="p-3.5">
                      <div className="flex justify-between items-center mb-2.5">
                        <div className="flex items-center gap-4">
                          <button onClick={() => handleToggleLike(post.id)} className="transition-transform active:scale-125">
                            <HeartIcon className={`w-6 h-6 ${post.is_liked ? 'text-rose-500 fill-rose-500' : 'text-white'}`} />
                          </button>
                          <button onClick={() => setActiveCommentsModal(post)} className="hover:opacity-75">
                            <CommentIcon className="w-6 h-6 text-white" />
                          </button>
                          <button onClick={() => setActiveShareModal(post)} className="hover:opacity-75">
                            <DirectIcon className="w-6 h-6 text-white" />
                          </button>
                        </div>
                        <button onClick={() => handleToggleSave(post.id)} className="hover:opacity-75">
                          <BookmarkIcon className={`w-6 h-6 ${post.is_saved ? 'text-white fill-white' : 'text-white'}`} />
                        </button>
                      </div>

                      {/* Likes count */}
                      <div className="text-xs font-bold text-white mb-1.5">
                        {post.likes_count.toLocaleString()} to se líbí
                      </div>

                      {/* Caption */}
                      <div className="text-xs text-neutral-200 leading-normal mb-2">
                        <span className="font-bold text-white mr-2">{post.user.username}</span>
                        <span>{post.caption}</span>
                      </div>

                      {/* Comments Preview Link */}
                      {post.comments_count > 0 && (
                        <button
                          onClick={() => setActiveCommentsModal(post)}
                          className="text-xs text-neutral-500 font-medium mb-2 block hover:underline"
                        >
                          Zobrazit všech {post.comments_count} komentářů
                        </button>
                      )}

                      {/* Recent Comment Preview */}
                      {post.comments.slice(-2).map(c => (
                        <div key={c.id} className="text-xs text-neutral-300 flex justify-between items-start mb-1">
                          <div>
                            <span className="font-bold mr-2 text-white">{c.user.username}</span>
                            <span>{c.text}</span>
                          </div>
                        </div>
                      ))}

                      {/* Sound Badge */}
                      {post.audio_title && (
                        <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mt-2">
                          <span>🎵</span>
                          <span className="truncate">{post.audio_title}</span>
                        </div>
                      )}
                    </div>

                    {/* Quick Add Comment Box */}
                    <div className="border-t border-neutral-900 px-3.5 py-2.5 flex items-center gap-3">
                      <input
                        type="text"
                        placeholder="Přidat komentář..."
                        value={commentInput[post.id] || ''}
                        onChange={e => setCommentInput({ ...commentInput, [post.id]: e.target.value })}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(post.id)}
                        className="flex-1 bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
                      />
                      {commentInput[post.id]?.trim() && (
                        <button
                          onClick={() => handleAddComment(post.id)}
                          className="text-xs font-bold text-indigo-500 hover:text-indigo-400"
                        >
                          Zveřejnit
                        </button>
                      )}
                    </div>

                  </article>
                )
              })}
            </div>
          )}
        </main>

        {/* ================================================= */}
        {/* RIGHT SIDEBAR (SUGGESTIONS & PROFILE - DESKTOP) */}
        {/* ================================================= */}
        <aside className="hidden lg:block w-[320px] xl:w-[350px] p-6 sticky top-0 h-screen">
          {/* User Profile Switcher */}
          {currentUser && (
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <img src={currentUser.avatar_url} className="w-12 h-12 rounded-full object-cover border border-neutral-800" />
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    {currentUser.username}
                    <VerifiedBadge className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <div className="text-xs text-neutral-500">{currentUser.full_name}</div>
                </div>
              </div>
              <button className="text-xs font-bold text-indigo-500 hover:text-white transition">Přepnout</button>
            </div>
          )}

          {/* Suggestions Header */}
          <div className="flex justify-between items-center mb-4">
            <span className="text-xs font-bold text-neutral-400">Návrhy pro vás</span>
            <button className="text-xs font-bold text-white hover:text-neutral-400">Zobrazit vše</button>
          </div>

          {/* Suggestions List */}
          <div className="flex flex-col gap-3">
            {suggestions.map(user => (
              <div key={user.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={user.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <div className="text-xs font-bold text-white hover:underline cursor-pointer">{user.username}</div>
                    <div className="text-[10px] text-neutral-500">Sleduje uživatel alex + 3 další</div>
                  </div>
                </div>
                <button className="text-xs font-bold text-indigo-500 hover:text-white transition">Sledovat</button>
              </div>
            ))}
          </div>

          {/* Instagram Footer Links */}
          <footer className="mt-8 text-[11px] text-neutral-600 flex flex-col gap-3">
            <div className="flex flex-wrap gap-x-2 gap-y-1">
              <span>Informace</span> • <span>Nápověda</span> • <span>Tisk</span> • <span>API</span> • <span>Kariéra</span> • <span>Soukromí</span> • <span>Smluvní podmínky</span>
            </div>
            <div>© 2026 INSTAGRAM CLONE FROM PAWMEET</div>
          </footer>
        </aside>

      </div>

      {/* ================================================= */}
      {/* MODALS & OVERLAYS */}
      {/* ================================================= */}

      {/* 1. NOTIFICATIONS FLYOUT */}
      {isNotificationsOpen && (
        <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[380px] bg-neutral-950 border-l border-neutral-800 p-4 shadow-2xl flex flex-col">
          <div className="flex justify-between items-center border-b border-neutral-800 pb-3 mb-4">
            <h3 className="text-base font-bold">Upozornění</h3>
            <button onClick={() => setIsNotificationsOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-4">
            {notifications.map(n => (
              <div key={n.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <img src={n.user.avatar_url} className="w-9 h-9 rounded-full object-cover" />
                  <div>
                    <span className="font-bold text-white mr-1">{n.user.username}</span>
                    <span className="text-neutral-300">
                      {n.type === 'like' && 'to se líbí váš příspěvek.'}
                      {n.type === 'comment' && 'přidal komentář k příspěvku.'}
                      {n.type === 'follow' && 'vás začal sledovat.'}
                    </span>
                    <span className="text-neutral-500 block text-[10px]">{n.created_at}</span>
                  </div>
                </div>
                {n.post_media && <img src={n.post_media} className="w-9 h-9 rounded object-cover" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. STORY FULLSCREEN VIEWER */}
      {activeStoryGroupIndex !== null && (
        <div className="fixed inset-0 z-50 bg-neutral-950 flex flex-col justify-between items-center p-4">
          {/* Progress Bar Header */}
          <div className="w-full max-w-md flex flex-col gap-2 z-10 pt-2">
            <div className="flex gap-1 w-full">
              {storiesList[activeStoryGroupIndex].stories.map((s, idx) => (
                <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear"
                    style={{
                      width: idx === activeStoryItemIndex ? `${storyProgress}%` : idx < activeStoryItemIndex ? '100%' : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <img src={storiesList[activeStoryGroupIndex].user.avatar_url} className="w-8 h-8 rounded-full border border-white object-cover" />
                <span className="text-xs font-bold">{storiesList[activeStoryGroupIndex].user.username}</span>
              </div>
              <button onClick={() => setActiveStoryGroupIndex(null)} className="text-white text-xl p-2 font-bold">✕</button>
            </div>
          </div>

          {/* Media Content */}
          <div className="relative flex-1 w-full max-w-md my-auto flex items-center justify-center overflow-hidden rounded-2xl">
            <img
              src={storiesList[activeStoryGroupIndex].stories[activeStoryItemIndex]?.media_url}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex">
              <div
                className="w-1/2 h-full"
                onClick={() => {
                  if (activeStoryItemIndex > 0) setActiveStoryItemIndex(i => i - 1)
                }}
              />
              <div
                className="w-1/2 h-full"
                onClick={() => {
                  if (activeStoryItemIndex < storiesList[activeStoryGroupIndex].stories.length - 1) {
                    setActiveStoryItemIndex(i => i + 1)
                  } else {
                    setActiveStoryGroupIndex(null)
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. CREATE CONTENT MODAL (POST / STORY / REEL) */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-neutral-800 flex justify-between items-center">
              <div className="flex gap-4">
                {(['post', 'story', 'reel'] as CreateTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setCreateTab(tab)}
                    className={`text-xs font-bold capitalize pb-1 ${
                      createTab === tab ? 'text-white border-b-2 border-indigo-500' : 'text-neutral-500'
                    }`}
                  >
                    {tab === 'post' ? 'Příspěvek' : tab === 'story' ? 'Příběh' : 'Reel'}
                  </button>
                ))}
              </div>
              <button onClick={() => setIsCreateOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>

            {/* Form */}
            <form onSubmit={handlePublishContent} className="p-5 flex flex-col gap-4">
              {previewUrls.length > 0 ? (
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-black border border-neutral-800">
                  <img src={previewUrls[0]} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPreviewUrls([]); setUploadFiles([]); }}
                    className="absolute top-2 right-2 bg-black/70 text-white rounded-full p-1.5 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-neutral-700 hover:border-indigo-500 rounded-2xl p-10 text-center cursor-pointer bg-neutral-950 hover:bg-neutral-900 transition flex flex-col items-center justify-center gap-2"
                >
                  <span className="text-4xl">📸</span>
                  <span className="text-xs font-semibold text-neutral-300">Přetáhněte sem fotky nebo videa</span>
                  <span className="text-[10px] text-neutral-500">Vyberte ze zařízení</span>
                </div>
              )}

              <input
                type="file"
                ref={fileInputRef}
                multiple={createTab === 'post'}
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {createTab !== 'story' && (
                <>
                  <textarea
                    placeholder="Napište popisek..."
                    value={createCaption}
                    onChange={e => setCreateCaption(e.target.value)}
                    rows={3}
                    className="w-full bg-neutral-950 text-xs p-3 rounded-xl border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                  <input
                    type="text"
                    placeholder="Přidat místo..."
                    value={createLocation}
                    onChange={e => setCreateLocation(e.target.value)}
                    className="w-full bg-neutral-950 text-xs p-3 rounded-xl border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                  <input
                    type="text"
                    placeholder="Název zvuku (volitelné)..."
                    value={createAudioTitle}
                    onChange={e => setCreateAudioTitle(e.target.value)}
                    className="w-full bg-neutral-950 text-xs p-3 rounded-xl border border-neutral-800 text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500"
                  />
                </>
              )}

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-400 hover:bg-neutral-800"
                >
                  Zrušit
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !previewUrls.length}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 shadow-lg"
                >
                  {isUploading ? 'Publikuji...' : 'Sdílet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. COMMENTS MODAL */}
      {activeCommentsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh]">
            <div className="w-full md:w-1/2 bg-black flex items-center justify-center">
              <img src={activeCommentsModal.media[0]?.url} className="w-full h-full object-cover max-h-[400px] md:max-h-full" />
            </div>

            <div className="w-full md:w-1/2 flex flex-col justify-between p-4">
              <div className="flex justify-between items-center border-b border-neutral-900 pb-3">
                <div className="flex items-center gap-2">
                  <img src={activeCommentsModal.user.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                  <span className="text-xs font-bold">{activeCommentsModal.user.username}</span>
                </div>
                <button onClick={() => setActiveCommentsModal(null)} className="text-neutral-400 hover:text-white">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-3 max-h-[300px]">
                {activeCommentsModal.comments.map(c => (
                  <div key={c.id} className="flex gap-3 text-xs">
                    <img src={c.user.avatar_url} className="w-7 h-7 rounded-full object-cover" />
                    <div>
                      <span className="font-bold mr-2">{c.user.username}</span>
                      <span>{c.text}</span>
                      <div className="text-[10px] text-neutral-500 mt-1">{c.created_at}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-neutral-900 pt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Komentovat..."
                  value={modalCommentInput}
                  onChange={e => setModalCommentInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment(activeCommentsModal.id, modalCommentInput)}
                  className="flex-1 bg-neutral-900 text-xs text-white px-3 py-2 rounded-xl border border-neutral-800 focus:outline-none"
                />
                <button
                  onClick={() => handleAddComment(activeCommentsModal.id, modalCommentInput)}
                  className="text-xs font-bold text-indigo-500"
                >
                  Odeslat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs px-5 py-3 rounded-full border border-neutral-700 shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <BottomNav />
    </div>
  )
}

// ==========================================
// SVG ICON COMPONENTS
// ==========================================

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  )
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

function ExploreIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function ReelsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  )
}

function DirectIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  )
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.684a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  )
}

function PlusSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function CommentIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    </svg>
  )
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}

function DotsHorizontalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="1.5" /><circle cx="6" cy="12" r="1.5" /><circle cx="18" cy="12" r="1.5" />
    </svg>
  )
}

function VerifiedBadge({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  )
}

function NavItem({ icon, label, active, badge, onClick }: { icon: React.ReactNode; label: string; active?: boolean; badge?: number; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 p-3 rounded-xl transition hover:bg-neutral-900 w-full text-left relative ${
        active ? 'font-bold text-white' : 'text-neutral-300'
      }`}
    >
      <div className="relative">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -top-1 -right-1 bg-rose-600 text-[10px] font-bold text-white rounded-full w-4 h-4 flex items-center justify-center">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="text-sm">{label}</span>
    </button>
  )
}

// ==========================================
// MOCK DATA GENERATORS (FALLBACKS)
// ==========================================

function getRelativeTime(dateStr: string) {
  return '2 H'
}

function getMockPosts(user: Profile): Post[] {
  return [
    {
      id: 'mock_1',
      user_id: 'user_1',
      user: {
        id: 'user_1',
        username: 'luna_golden_retriever',
        avatar_url: 'https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=300&q=80',
        is_verified: true
      },
      media: [
        { url: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80', type: 'image' },
        { url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=800&q=80', type: 'image' }
      ],
      caption: 'Odpolední procházka v parku! 🐾☀️ #goldenretriever #doglife #pawmeet',
      location: 'Stromovka, Praha',
      audio_title: 'Original Audio - luna_golden',
      likes_count: 1420,
      comments_count: 32,
      shares_count: 12,
      is_liked: false,
      is_saved: false,
      comments: [
        {
          id: 'c1',
          user: { id: 'u2', username: 'max_husky', avatar_url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=150&q=80' },
          text: 'Super fotka! Příště se musíme potkat 🐺',
          created_at: '1h',
          likes_count: 3,
          is_liked: false
        }
      ],
      created_at: '2 h'
    },
    {
      id: 'mock_2',
      user_id: 'user_2',
      user: {
        id: 'user_2',
        username: 'corgi_charlie',
        avatar_url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=300&q=80',
        is_verified: false
      },
      media: [
        { url: 'https://images.unsplash.com/photo-1517849845537-4d257902454a?auto=format&fit=crop&w=800&q=80', type: 'image' }
      ],
      caption: 'Nová hračka z PawMeet obchodu 🎉🐶',
      location: 'Brno',
      audio_title: 'Happy Dog Music',
      likes_count: 890,
      comments_count: 14,
      shares_count: 5,
      is_liked: true,
      is_saved: true,
      comments: [],
      created_at: '5 h'
    }
  ]
}

function getMockStories(): UserStories[] {
  return [
    {
      user: {
        id: 's1',
        username: 'max_husky',
        avatar_url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=150&q=80'
      },
      stories: [
        { id: 'st1', media_url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=600&q=80', type: 'image', duration: 5, created_at: '1h' }
      ],
      has_unseen: true
    },
    {
      user: {
        id: 's2',
        username: 'bella_cat',
        avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150&q=80'
      },
      stories: [
        { id: 'st2', media_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=600&q=80', type: 'image', duration: 5, created_at: '3h' }
      ],
      has_unseen: true
    }
  ]
}

function getMockSuggestions(): Profile[] {
  return [
    { id: 'sug1', username: 'frenchie_rocky', avatar_url: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&w=150&q=80' },
    { id: 'sug2', username: 'shiba_ken', avatar_url: 'https://images.unsplash.com/photo-1560807707-8cc77767d783?auto=format&fit=crop&w=150&q=80' },
    { id: 'sug3', username: 'poodle_coco', avatar_url: 'https://images.unsplash.com/photo-1534361960057-19889db9875e?auto=format&fit=crop&w=150&q=80' }
  ]
}

function getMockNotifications(): NotificationItem[] {
  return [
    {
      id: 'n1',
      user: { id: 'u1', username: 'max_husky', avatar_url: 'https://images.unsplash.com/photo-1537151608828-ea2b11777ee8?auto=format&fit=crop&w=150&q=80' },
      type: 'like',
      post_media: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=150&q=80',
      created_at: 'před 15 min',
      is_read: false
    },
    {
      id: 'n2',
      user: { id: 'u2', username: 'bella_cat', avatar_url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=150&q=80' },
      type: 'comment',
      created_at: 'před 2 hod',
      is_read: false
    }
  ]
}