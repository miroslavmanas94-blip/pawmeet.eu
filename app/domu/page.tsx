'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import BottomNav from '@/components/BottomNav'

type CreateTab = 'post' | 'story'

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

export default function InstagramHomeFull() {
  const supabase = createClient()

  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [storiesList, setStoriesList] = useState<UserStories[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createTab, setCreateTab] = useState<CreateTab>('post')
  const [uploadFiles, setUploadFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [createCaption, setCreateCaption] = useState('')
  const [createLocation, setCreateLocation] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  // STAVY PRO STORIES VIEWER (MODAL)
  const [activeStoryGroupIndex, setActiveStoryGroupIndex] = useState<number | null>(null)
  const [activeStoryItemIndex, setActiveStoryItemIndex] = useState<number>(0)
  const [storyCommentInput, setStoryCommentInput] = useState('')
  const [mediaError, setMediaError] = useState(false)

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

      // Načtení příspěvků
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
                username: p.user_id ? `Uživatel_${p.user_id.substring(0, 5)}` : 'Neznámý uživatel',
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

      // Bezpečné načtení Stories a filtrace v JS (vyřeší problémy s časovými zónami a mizením)
      const { data: rawStories } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type, created_at')
        .order('created_at', { ascending: true })

      if (rawStories && rawStories.length > 0) {
        const nowTime = Date.now()
        const twentyFourHours = 24 * 60 * 60 * 1000

        // Filtrujeme pouze ty, které jsou mladší než 24 hodin
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
                sUser = { username: `Uživatel_${uid.substring(0, 5)}`, avatar_url: '' }
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
        } else {
          setStoriesList([])
        }
      } else {
        setStoriesList([])
      }

    } catch (err) {
      console.error('Chyba při načítání:', err)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchFeedData()
  }, [fetchFeedData])

  const handleNextStory = useCallback(() => {
    if (activeStoryGroupIndex === null) return
    const currentGroup = storiesList[activeStoryGroupIndex]

    setMediaError(false)
    if (activeStoryItemIndex < currentGroup.stories.length - 1) {
      setActiveStoryItemIndex(prev => prev + 1)
      setStoryCommentInput('')
    } else {
      if (activeStoryGroupIndex < storiesList.length - 1) {
        setActiveStoryGroupIndex(prev => prev! + 1)
        setActiveStoryItemIndex(0)
        setStoryCommentInput('')
      } else {
        setActiveStoryGroupIndex(null)
      }
    }
  }, [activeStoryGroupIndex, activeStoryItemIndex, storiesList])

  const handlePrevStory = () => {
    if (activeStoryGroupIndex === null) return

    setMediaError(false)
    if (activeStoryItemIndex > 0) {
      setActiveStoryItemIndex(prev => prev - 1)
      setStoryCommentInput('')
    } else {
      if (activeStoryGroupIndex > 0) {
        setActiveStoryGroupIndex(prev => prev! - 1)
        const prevGroupStoriesCount = storiesList[activeStoryGroupIndex - 1].stories.length
        setActiveStoryItemIndex(prevGroupStoriesCount - 1)
        setStoryCommentInput('')
      }
    }
  }

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
    showToast(nextSaved ? 'Příspěvek uložen' : 'Příspěvek odebrán z uložených')
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

  const handleLikeActiveStory = () => {
    if (activeStoryGroupIndex === null) return
    setStoriesList(prev => {
      const copy = [...prev]
      const group = copy[activeStoryGroupIndex]
      if (!group || !group.stories[activeStoryItemIndex]) return prev

      const item = group.stories[activeStoryItemIndex]
      const nextLiked = !item.is_liked
      item.is_liked = nextLiked
      item.likes_count = (item.likes_count || 0) + (nextLiked ? 1 : -1)

      return copy
    })
    showToast('❤️ To se líbí příběhu')
  }

  const handleSendStoryComment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!storyCommentInput.trim()) return
    showToast('💬 Odpověď na příběh odeslána!')
    setStoryCommentInput('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setUploadFiles(files)
    setPreviewUrls(files.map(file => URL.createObjectURL(file)))
  }

  const handlePublishContent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!previewUrls.length) return

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
        : previewUrls.map(url => ({ url, type: 'image' as const }))

      if (createTab === 'story') {
        const { error } = await supabase.from('stories').insert({
          user_id: currentUser?.id !== 'guest' ? currentUser?.id : null,
          media_url: mediaToSave[0].url,
          media_type: mediaToSave[0].type
        })
        if (error) throw error
        showToast('🎉 Příběh byl publikován!')
      } else {
        const { error } = await supabase.from('posts').insert({
          user_id: currentUser?.id !== 'guest' ? currentUser?.id : null,
          media_url: JSON.stringify(mediaToSave),
          media_type: mediaToSave.length > 1 ? 'carousel' : mediaToSave[0].type,
          caption: createCaption,
          location: createLocation || null
        })
        if (error) throw error
        showToast('✨ Příspěvek byl publikován!')
      }

      setIsCreateOpen(false)
      setUploadFiles([])
      setPreviewUrls([])
      setCreateCaption('')
      setCreateLocation('')
      await fetchFeedData()
    } catch (err: any) {
      showToast(`Chyba: ${err.message || 'Nepodařilo se publikovat'}`)
    } finally {
      setIsUploading(false)
    }
  }

  const activeStoryGroup = activeStoryGroupIndex !== null ? storiesList[activeStoryGroupIndex] : null
  const activeStoryItem = activeStoryGroup ? activeStoryGroup.stories[activeStoryItemIndex] : null

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 font-sans antialiased flex flex-col">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-5 py-2.5 rounded-full text-xs font-medium shadow-2xl border border-slate-800 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* HORNI BAR */}
      <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex justify-end items-center shadow-sm">
        <button
          onClick={() => { setCreateTab('post'); setIsCreateOpen(true); }}
          className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition active:scale-95 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          <span>Přidat příspěvek</span>
        </button>
      </header>

      {/* OBSAH FEEDU */}
      <main className="flex-1 w-full px-3 sm:px-6 md:px-8 py-4 pb-24 max-w-7xl mx-auto flex flex-col items-center">
        {/* STORIES */}
        <section className="w-full bg-white rounded-2xl border border-slate-200/80 p-4 mb-6 shadow-sm overflow-x-auto no-scrollbar">
          <div className="flex gap-5 items-center min-w-max">
            <div
              onClick={() => { setCreateTab('story'); setIsCreateOpen(true); }}
              className="flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0"
            >
              <div className="relative w-16 h-16 rounded-full p-0.5 border-2 border-dashed border-rose-400 group-hover:scale-105 transition-transform bg-white flex items-center justify-center overflow-hidden">
                {currentUser?.avatar_url ? (
                  <img src={currentUser.avatar_url} alt="Váš profil" className="w-full h-full rounded-full object-cover" />
                ) : (
                  <span className="text-xl select-none">🐾</span>
                )}
                <div className="absolute bottom-0 right-0 bg-rose-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border-2 border-white shadow">
                  +
                </div>
              </div>
              <span className="text-[11px] font-medium text-slate-600 truncate max-w-[72px]">Váš příběh</span>
            </div>

            {storiesList.map((storyGroup, sIdx) => (
              <div
                key={storyGroup.user.id}
                onClick={() => {
                  setMediaError(false)
                  setActiveStoryGroupIndex(sIdx)
                  setActiveStoryItemIndex(0)
                }}
                className="flex flex-col items-center gap-1.5 cursor-pointer group flex-shrink-0"
              >
                <div className="p-[2.5px] rounded-full bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 transition-transform group-hover:scale-105 shadow-sm">
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white bg-slate-100 flex items-center justify-center">
                    {storyGroup.user.avatar_url ? (
                      <img src={storyGroup.user.avatar_url} alt={storyGroup.user.username} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl select-none">🐾</span>
                    )}
                  </div>
                </div>
                <span className="text-[11px] font-medium text-slate-700 truncate max-w-[72px]">{storyGroup.user.username}</span>
              </div>
            ))}
          </div>
        </section>

        {/* LIST PŘÍSPĚVKŮ */}
        {isLoading ? (
          <div className="w-full max-w-2xl flex flex-col gap-6 py-4">
            {[1, 2].map(n => (
              <div key={n} className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm animate-pulse h-[480px]" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 shadow-sm my-8">
            <p className="text-base font-semibold text-slate-800 mb-1">Žádné příspěvky</p>
            <p className="text-xs text-slate-500">Zatím nebyly publikovány žádné příspěvky.</p>
          </div>
        ) : (
          <div className="w-full max-w-2xl flex flex-col gap-6">
            {posts.map(post => {
              const currentMedia = post.media[0]

              return (
                <article key={post.id} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden w-full">
                  {/* AUTOR PŘÍSPĚVKU - JMÉNO A SKUTEČNÁ PROFILOVKA NEBO 🐾 */}
                  <div className="flex justify-between items-center px-4 py-3.5 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                        {post.user.avatar_url ? (
                          <img src={post.user.avatar_url} alt={post.user.username} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-base select-none">🐾</span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900">{post.user.username}</span>
                          <span className="text-slate-400 text-[11px]">• {post.created_at}</span>
                        </div>
                        {post.location && <span className="text-[10px] text-slate-500 block">{post.location}</span>}
                      </div>
                    </div>
                  </div>

                  {/* MÉDIA */}
                  <div
                    className="relative bg-slate-900 aspect-square w-full overflow-hidden select-none flex items-center justify-center cursor-pointer"
                    onDoubleClick={() => {
                      if (!post.is_liked) handleToggleLike(post.id)
                      setDoubleTapHeartPostId(post.id)
                      setTimeout(() => setDoubleTapHeartPostId(null), 900)
                    }}
                  >
                    {currentMedia?.type === 'video' ? (
                      <video src={currentMedia.url} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                    ) : (
                      <img src={currentMedia?.url} alt="Příspěvek" className="w-full h-full object-cover" />
                    )}

                    {doubleTapHeartPostId === post.id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px] animate-ping">
                        <span className="text-7xl text-rose-500 drop-shadow-md">❤️</span>
                      </div>
                    )}
                  </div>

                  {/* AKCE A KOMENTÁŘE */}
                  <div className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-4">
                        <button onClick={() => handleToggleLike(post.id)} className="text-xl">
                          {post.is_liked ? '❤️' : '🤍'}
                        </button>
                      </div>
                      <button onClick={() => handleToggleSave(post.id)} className="text-xl">
                        {post.is_saved ? '🔖' : '🏷️'}
                      </button>
                    </div>

                    <div className="text-xs font-bold text-slate-900 mb-1.5">{post.likes_count} To se líbí</div>

                    <div className="text-xs text-slate-700 mb-3">
                      <span className="font-bold text-slate-900 mr-2">{post.user.username}</span>
                      <span>{post.caption}</span>
                    </div>

                    <div className="mt-3 flex items-center border-t border-slate-100 pt-3">
                      <input
                        type="text"
                        placeholder="Přidat komentář..."
                        value={commentInput[post.id] || ''}
                        onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        className="bg-slate-50 border border-slate-200 text-xs w-full text-slate-900 rounded-full px-3.5 py-2 outline-none focus:bg-white"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        disabled={!commentInput[post.id]?.trim()}
                        className="text-xs text-indigo-600 font-bold ml-2.5 disabled:opacity-40"
                      >
                        Zveřejnit
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>

      {/* PROFESIONÁLNÍ INSTAGRAM-STYLE STORIES VIEWER */}
      {activeStoryGroup && activeStoryItem && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center select-none">
          <div className="relative w-full h-full sm:max-w-md sm:h-[88vh] sm:rounded-2xl overflow-hidden bg-black flex flex-col justify-between shadow-2xl">
            
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-0">
              {!mediaError && activeStoryItem.media_url ? (
                activeStoryItem.type === 'video' ? (
                  <video 
                    src={activeStoryItem.media_url} 
                    autoPlay 
                    playsInline 
                    onError={() => setMediaError(true)}
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <img 
                    src={activeStoryItem.media_url} 
                    alt="Story" 
                    onError={() => setMediaError(true)}
                    className="w-full h-full object-cover" 
                  />
                )
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 p-6 text-center text-white bg-gradient-to-br from-indigo-900 via-slate-900 to-black w-full h-full">
                  <div className="w-20 h-20 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-3xl shadow-lg">
                    🐾
                  </div>
                  <span className="text-sm font-bold">{activeStoryGroup.user.username}</span>
                  <span className="text-xs text-white/60">Příběh nelze načíst nebo vypršel</span>
                </div>
              )}
            </div>

            <div className="absolute inset-y-0 left-0 w-1/3 z-10 cursor-pointer" onClick={handlePrevStory} />
            <div className="absolute inset-y-0 right-0 w-1/3 z-10 cursor-pointer" onClick={handleNextStory} />

            <div className="relative z-20 flex flex-col gap-2 pt-3 px-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent pb-6">
              <div className="flex gap-1 w-full">
                {activeStoryGroup.stories.map((st, idx) => (
                  <div key={st.id} className="flex-1 h-[2px] bg-white/40 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-white transition-all duration-300 ${
                        idx < activeStoryItemIndex ? 'w-full' : idx === activeStoryItemIndex ? 'w-full animate-pulse' : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/60 bg-slate-800 flex items-center justify-center shrink-0">
                    {activeStoryGroup.user.avatar_url ? (
                      <img src={activeStoryGroup.user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs select-none">🐾</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white drop-shadow">{activeStoryGroup.user.username}</span>
                    <span className="text-[10px] text-white/70">• {getRelativeTime(activeStoryItem.created_at)}</span>
                  </div>
                </div>
                
                <button
                  onClick={() => {
                    setActiveStoryGroupIndex(null)
                    setActiveStoryItemIndex(0)
                  }}
                  className="text-white text-lg font-bold w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 transition backdrop-blur-sm"
                  title="Zavřít"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="relative z-20 p-4 bg-gradient-to-t from-black/90 via-black/50 to-transparent flex items-center gap-3 mt-auto">
              <form onSubmit={handleSendStoryComment} className="flex-1 flex items-center">
                <input
                  type="text"
                  placeholder={`Odpovědět uživateli ${activeStoryGroup.user.username}...`}
                  value={storyCommentInput}
                  onChange={(e) => setStoryCommentInput(e.target.value)}
                  className="bg-black/30 backdrop-blur-md border border-white/30 text-xs text-white placeholder-white/70 rounded-full px-4 py-3 w-full outline-none focus:bg-black/50 transition shadow-inner"
                />
              </form>
              <button
                onClick={handleLikeActiveStory}
                className="text-2xl p-2 bg-black/30 backdrop-blur-md border border-white/20 rounded-full w-11 h-11 flex items-center justify-center hover:bg-black/50 transition shrink-0 active:scale-95 shadow"
              >
                {activeStoryItem.is_liked ? '❤️' : '🤍'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL NOVÉHO PŘÍSPĚVKU / PŘÍBĚHU */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="font-bold text-slate-900 text-sm">Vytvořit {createTab === 'story' ? 'Příběh' : 'Příspěvek'}</span>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 font-bold text-lg">✕</button>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setCreateTab('post')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${createTab === 'post' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Příspěvek
              </button>
              <button
                onClick={() => setCreateTab('story')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold ${createTab === 'story' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Příběh
              </button>
            </div>

            <form onSubmit={handlePublishContent} className="flex flex-col gap-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                multiple={createTab === 'post'}
                className="hidden"
              />

              {previewUrls.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-50 transition"
                >
                  <span className="text-3xl">📁</span>
                  <span className="text-xs font-medium text-slate-700">Vybrat soubory z počítače</span>
                </div>
              ) : (
                <div className="flex gap-2 overflow-x-auto py-2">
                  {previewUrls.map((url, idx) => (
                    <div key={idx} className="relative w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
                      <img src={url} alt="Náhled" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              {createTab === 'post' && (
                <>
                  <textarea
                    placeholder="Napište popis příspěvku..."
                    value={createCaption}
                    onChange={(e) => setCreateCaption(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 outline-none focus:bg-white resize-none h-20"
                  />
                  <input
                    type="text"
                    placeholder="Lokalita (např. Praha)"
                    value={createLocation}
                    onChange={(e) => setCreateLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 outline-none focus:bg-white"
                  />
                </>
              )}

              <button
                type="submit"
                disabled={isUploading || previewUrls.length === 0}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isUploading ? 'Publikuji...' : 'Sdílet'}
              </button>
            </form>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}