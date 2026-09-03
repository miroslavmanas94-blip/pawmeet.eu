'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

type ProfileData = {
  id: string
  username: string
  full_name: string
  avatar_url: string
  bio: string
  website: string
  posts_count?: number
  followers_count?: number
  following_count?: number
  avatar_scale?: number
  avatar_x?: number
  avatar_y?: number
}

type CommentItem = {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: {
    username: string
    avatar_url: string
  }
}

type Post = {
  id: string
  user_id: string
  image_url?: string
  media_url?: string
  url?: string
  photo_url?: string
  caption?: string
  likes_count?: number
  comments_count?: number
  created_at?: string
  is_liked?: boolean
  is_saved?: boolean
  [key: string]: any
}

type FollowUser = {
  id: string
  username: string
  full_name: string
  avatar_url: string
}

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts')

  // Stavy pro příspěvky a modal feed
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null)

  // Stavy pro interakce (komentáře)
  const [commentsMap, setCommentsMap] = useState<Record<string, CommentItem[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  // Stavy pro modální okno sledovatelů / sledovaných
  const [isFollowModalOpen, setIsFollowModalOpen] = useState(false)
  const [followModalTab, setFollowModalTab] = useState<'followers' | 'following'>('followers')
  const [followersList, setFollowersList] = useState<FollowUser[]>([])
  const [followingList, setFollowingList] = useState<FollowUser[]>([])
  const [loadingFollows, setLoadingFollows] = useState(false)

  // Data profilu
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    username: '',
    full_name: '',
    avatar_url: '',
    bio: '',
    website: '',
    posts_count: 0,
    followers_count: 0,
    following_count: 0,
    avatar_scale: 1,
    avatar_x: 0,
    avatar_y: 0,
  })

  // Stavy pro úpravu v modálním okně
  const [editForm, setEditForm] = useState<ProfileData>(profile)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Pomocná funkce pro získání platné veřejné URL adresy avatara
  const getAvatarUrl = (url?: string) => {
    if (!url) return ''
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
      return url
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(url)
    return data.publicUrl
  }

  // Načtení profilu, příspěvků a stavů lajků/uložení
  useEffect(() => {
    const fetchProfileAndPosts = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // 1. Načtení profilu
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        // 2. Načtení reálných příspěvků daného uživatele
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        const rawPosts = postsData || []
        const postIds = rawPosts.map((p) => p.id)

        // 3. Načtení stávajících lajků a uložení pro přihlášeného uživatele
        let likedPostIds = new Set<string>()
        let savedPostIds = new Set<string>()

        if (postIds.length > 0) {
          const { data: likesData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)

          const { data: savedData } = await supabase
            .from('saved_posts')
            .select('post_id')
            .eq('user_id', user.id)
            .in('post_id', postIds)

          likedPostIds = new Set((likesData || []).map((l) => l.post_id))
          savedPostIds = new Set((savedData || []).map((s) => s.post_id))
        }

        const formattedPosts: Post[] = rawPosts.map((post) => ({
          ...post,
          is_liked: likedPostIds.has(post.id),
          is_saved: savedPostIds.has(post.id),
          likes_count: post.likes_count || 0,
        }))

        setPosts(formattedPosts)

        // 4. Spočítání sledujících/sledovaných
        let followersCount = 0
        let followingCount = 0

        try {
          const { count: fCount } = await supabase
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', user.id)

          const { count: fgCount } = await supabase
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', user.id)

          followersCount = fCount || 0
          followingCount = fgCount || 0
        } catch (e) {
          // Ignorujeme, pokud tabulka neexistuje
        }

        const rawAvatar = profileData?.avatar_url || profileData?.avatar || user.user_metadata?.avatar_url || ''
        const resolvedAvatar = getAvatarUrl(rawAvatar)

        const loadedProfile: ProfileData = {
          id: user.id,
          username: profileData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'uzivatel',
          full_name: profileData?.full_name || user.user_metadata?.full_name || 'Uživatel',
          avatar_url: resolvedAvatar,
          bio: profileData?.bio || user.user_metadata?.bio || 'Zatím bez popisu',
          website: profileData?.website || '',
          posts_count: formattedPosts.length,
          followers_count: profileData?.followers_count ?? followersCount,
          following_count: profileData?.following_count ?? followingCount,
          avatar_scale: profileData?.avatar_scale ?? 1,
          avatar_x: profileData?.avatar_x ?? 0,
          avatar_y: profileData?.avatar_y ?? 0,
        }

        setProfile(loadedProfile)
        setEditForm(loadedProfile)
        setPreviewAvatarUrl(loadedProfile.avatar_url)
      }
      setLoading(false)
    }

    fetchProfileAndPosts()
  }, [])

  // Načtení seznamu sledujících a sledovaných
  const fetchFollowData = async (userId: string) => {
    if (!userId) return
    setLoadingFollows(true)
    try {
      const { data: followersData, error: fError } = await supabase
        .from('followers')
        .select('follower_id, profiles:follower_id (id, username, full_name, avatar_url)')
        .eq('following_id', userId)

      if (!fError && followersData) {
        const mappedFollowers = followersData
          .map((item: any) => {
            if (!item.profiles) return null
            return {
              ...item.profiles,
              avatar_url: getAvatarUrl(item.profiles.avatar_url)
            }
          })
          .filter(Boolean) as FollowUser[]
        setFollowersList(mappedFollowers)
      }

      const { data: followingData, error: fgError } = await supabase
        .from('followers')
        .select('following_id, profiles:following_id (id, username, full_name, avatar_url)')
        .eq('follower_id', userId)

      if (!fgError && followingData) {
        const mappedFollowing = followingData
          .map((item: any) => {
            if (!item.profiles) return null
            return {
              ...item.profiles,
              avatar_url: getAvatarUrl(item.profiles.avatar_url)
            }
          })
          .filter(Boolean) as FollowUser[]
        setFollowingList(mappedFollowing)
      }
    } catch (err) {
      console.error('Chyba při načítání vztahů:', err)
    } finally {
      setLoadingFollows(false)
    }
  }

  const handleOpenFollowModal = (tab: 'followers' | 'following') => {
    setFollowModalTab(tab)
    setIsFollowModalOpen(true)
    if (profile.id) {
      fetchFollowData(profile.id)
    }
  }

  // Prevence úniku paměti u objektových URL
  useEffect(() => {
    return () => {
      if (previewAvatarUrl && previewAvatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewAvatarUrl)
      }
    }
  }, [previewAvatarUrl])

  // --- AKCE: OTEVŘENÍ PŘÍSPĚVKU A NAČTENÍ KOMENTÁŘŮ ---
  const handleOpenPostFeed = (index: number) => {
    setSelectedPostIndex(index)
    posts.slice(index).forEach((p) => {
      if (!commentsMap[p.id]) {
        fetchCommentsForPost(p.id)
      }
    })
  }

  const fetchCommentsForPost = async (postId: string) => {
    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      const formattedComments = data.map((c: any) => ({
        ...c,
        profiles: c.profiles ? {
          ...c.profiles,
          avatar_url: getAvatarUrl(c.profiles.avatar_url)
        } : undefined
      }))
      setCommentsMap((prev) => ({ ...prev, [postId]: formattedComments }))
    }
  }

  // --- AKCE: LAJKOVÁNÍ ---
  const handleToggleLike = async (postId: string) => {
    if (!profile.id) return

    const targetPost = posts.find((p) => p.id === postId)
    if (!targetPost) return

    const isLiked = targetPost.is_liked

    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !isLiked,
              likes_count: (p.likes_count || 0) + (isLiked ? -1 : 1),
            }
          : p
      )
    )

    if (isLiked) {
      await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', profile.id)
    } else {
      await supabase.from('likes').insert({ post_id: postId, user_id: profile.id })
    }
  }

  // --- AKCE: ULOŽENÍ PŘÍSPĚVKU ---
  const handleToggleSave = async (postId: string) => {
    if (!profile.id) return

    const targetPost = posts.find((p) => p.id === postId)
    if (!targetPost) return

    const isSaved = targetPost.is_saved

    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, is_saved: !isSaved } : p))
    )

    if (isSaved) {
      await supabase.from('saved_posts').delete().eq('post_id', postId).eq('user_id', profile.id)
    } else {
      await supabase.from('saved_posts').insert({ post_id: postId, user_id: profile.id })
    }
  }

  // --- AKCE: PŘIDÁNÍ KOMENTÁŘE ---
  const handleAddComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim()
    if (!text || !profile.id) return

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        user_id: profile.id,
        content: text,
      })
      .select('*, profiles(username, avatar_url)')
      .single()

    if (!error && data) {
      const newComment = {
        ...data,
        profiles: data.profiles ? {
          ...data.profiles,
          avatar_url: getAvatarUrl(data.profiles.avatar_url)
        } : {
          username: profile.username,
          avatar_url: profile.avatar_url
        }
      }

      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment as CommentItem],
      }))

      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
        )
      )

      setCommentInputs((prev) => ({ ...prev, [postId]: '' }))
    }
  }

  // Otevření editoru
  const handleOpenEdit = () => {
    setEditForm(profile)
    setPreviewAvatarUrl(profile.avatar_url)
    setSelectedFile(null)
    setIsEditModalOpen(true)
  }

  // Výběr nové fotky
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      if (!file.type.startsWith('image/')) {
        alert('Vyberte prosím platný obrázek.')
        return
      }

      setSelectedFile(file)
      setPreviewAvatarUrl(URL.createObjectURL(file))
    }
  }

  // Uložení profilu do Supabase
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      let finalAvatarUrl = editForm.avatar_url

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const filePath = `${editForm.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: true })

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

          finalAvatarUrl = publicUrlData.publicUrl
        }
      }

      const updatedData = {
        id: editForm.id,
        username: editForm.username,
        full_name: editForm.full_name,
        bio: editForm.bio,
        website: editForm.website,
        avatar_url: finalAvatarUrl,
        avatar_scale: editForm.avatar_scale,
        avatar_x: editForm.avatar_x,
        avatar_y: editForm.avatar_y,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from('profiles').upsert(updatedData)

      if (!error) {
        setProfile({ ...editForm, avatar_url: finalAvatarUrl })
        setIsEditModalOpen(false)
      } else {
        alert('Chyba při ukládání profilu: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Pomocná funkce s automatickým parsováním JSON pro získání URL obrázku
  const getPostImageUrl = (post: Post) => {
    let raw: any = post.image_url || post.media_url || post.url || post.photo_url || ''
    if (!raw) return ''

    if (typeof raw === 'string' && (raw.startsWith('{') || raw.startsWith('['))) {
      try {
        raw = JSON.parse(raw)
      } catch (e) {
        return raw
      }
    }

    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0]
      if (typeof first === 'object' && first !== null) {
        return (first as any).url || (first as any).image_url || (first as any).media_url || ''
      }
      return String(first)
    }

    if (typeof raw === 'object' && raw !== null) {
      return (raw as any).url || (raw as any).image_url || (raw as any).media_url || ''
    }

    return String(raw)
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-500">Načítání profilu...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col items-center antialiased">
      {/* Hlavní kontejner */}
      <div className="w-full max-w-4xl px-4 py-8 flex-1">
        
        {/* HORNÍ SEKCE: Profilová karta */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-12 mb-8">
          
          {/* Profilový obrázek s gradientem */}
          <div className="relative group flex-shrink-0">
            <div className="w-32 h-32 md:w-36 md:h-36 rounded-full p-[3px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-100 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover transition-transform duration-200"
                      style={{
                        transform: `translate(${profile.avatar_x || 0}px, ${profile.avatar_y || 0}px) scale(${profile.avatar_scale || 1})`,
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* INFORMACE O UŽIVATELI */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-4">
            
            {/* Nickname + Tlačítka */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 w-full">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">@{profile.username}</h1>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleOpenEdit}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-sm active:scale-95"
                >
                  Upravit profil
                </button>

                <button 
                  onClick={handleOpenEdit}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition border border-slate-200/60"
                  title="Nastavení"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Statistiky */}
            <div className="flex items-center gap-6 py-3 border-y border-slate-100 md:border-none w-full justify-center md:justify-start">
              <div className="text-center md:text-left">
                <span className="font-bold text-slate-900 text-base">{profile.posts_count}</span>{' '}
                <span className="text-slate-500 text-xs md:text-sm">příspěvků</span>
              </div>
              <button
                onClick={() => handleOpenFollowModal('followers')}
                className="text-center md:text-left hover:opacity-75 transition cursor-pointer"
              >
                <span className="font-bold text-slate-900 text-base">{profile.followers_count}</span>{' '}
                <span className="text-slate-500 text-xs md:text-sm">sledujících</span>
              </button>
              <button
                onClick={() => handleOpenFollowModal('following')}
                className="text-center md:text-left hover:opacity-75 transition cursor-pointer"
              >
                <span className="font-bold text-slate-900 text-base">{profile.following_count}</span>{' '}
                <span className="text-slate-500 text-xs md:text-sm">sleduji</span>
              </button>
            </div>

            {/* Celé jméno, Bio a Web */}
            <div className="text-sm space-y-1 w-full">
              <h2 className="font-bold text-slate-900">{profile.full_name}</h2>
              <p className="whitespace-pre-line text-slate-600 leading-relaxed max-w-lg">{profile.bio}</p>
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 mt-1 text-xs"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 005.656-5.656l-1.1 1.1" />
                  </svg>
                  {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ZÁLOŽKY */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-1.5 mb-6 flex justify-center text-xs font-bold text-slate-500 shadow-sm">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'posts'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Příspěvky
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'saved'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
            Uložené
          </button>
          <button
            onClick={() => setActiveTab('tagged')}
            className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'tagged'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            Označení
          </button>
        </div>

        {/* OBSAH PODLE VYBRANÉ ZÁLOŽKY */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {posts.length === 0 ? (
              <div className="col-span-3 py-20 bg-white rounded-3xl border border-slate-200/80 text-center text-slate-400 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <p className="text-base font-bold text-slate-700">Zatím nemáš žádné příspěvky</p>
                <p className="text-xs text-slate-400 mt-1">Sdílej své fotky a zážitky!</p>
              </div>
            ) : (
              posts.map((post, idx) => {
                const imgUrl = getPostImageUrl(post)
                return (
                  <div
                    key={post.id}
                    onClick={() => handleOpenPostFeed(idx)}
                    className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-200/80 shadow-xs"
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt="Příspěvek"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 bg-slate-100">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition duration-200 flex items-center justify-center gap-6 font-bold text-white text-sm backdrop-blur-[2px]">
                      <span className="flex items-center gap-1.5">
                        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                        {post.likes_count || 0}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
                          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z" />
                        </svg>
                        {post.comments_count || 0}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="py-20 bg-white rounded-3xl border border-slate-200/80 text-center text-slate-400 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <p className="text-base font-bold text-slate-700">Žádné uložené příspěvky</p>
            <p className="text-xs text-slate-400 mt-1">Uložené příspěvky uvidíš pouze ty.</p>
          </div>
        )}

        {activeTab === 'tagged' && (
          <div className="py-20 bg-white rounded-3xl border border-slate-200/80 text-center text-slate-400 flex flex-col items-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
            <p className="text-base font-bold text-slate-700">Fotky s tebou</p>
            <p className="text-xs text-slate-400 mt-1">Až tě někdo označí na fotce, objeví se zde.</p>
          </div>
        )}
      </div>

      {/* MODÁLNÍ OKNO: SLEDUJÍCÍ / SLEDUJI */}
      {isFollowModalOpen && (
        <div
          onClick={() => setIsFollowModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-sm w-full h-[450px] shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            <div className="flex border-b border-slate-100 font-bold text-xs text-slate-500">
              <button
                onClick={() => setFollowModalTab('followers')}
                className={`flex-1 py-3.5 text-center transition border-b-2 ${
                  followModalTab === 'followers'
                    ? 'border-slate-900 text-slate-900 bg-slate-50/50'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {profile.followers_count || followersList.length} Sledujících
              </button>
              <button
                onClick={() => setFollowModalTab('following')}
                className={`flex-1 py-3.5 text-center transition border-b-2 ${
                  followModalTab === 'following'
                    ? 'border-slate-900 text-slate-900 bg-slate-50/50'
                    : 'border-transparent hover:text-slate-900'
                }`}
              >
                {profile.following_count || followingList.length} Sleduji
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingFollows ? (
                <div className="flex justify-center items-center h-full">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                </div>
              ) : (
                (() => {
                  const currentList = followModalTab === 'followers' ? followersList : followingList
                  if (currentList.length === 0) {
                    return (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs text-center py-10">
                        <p className="font-semibold text-slate-600">Zatím zde nic není</p>
                      </div>
                    )
                  }
                  return currentList.map((user) => (
                    <div key={user.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <svg className="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="text-xs font-bold text-slate-900 truncate">@{user.username}</h4>
                          <p className="text-[11px] text-slate-500 truncate">{user.full_name}</p>
                        </div>
                      </div>
                    </div>
                  ))
                })()
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODÁLNÍ OKNO: ÚPRAVA PROFILU */}
      {isEditModalOpen && (
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4"
          >
            <h3 className="text-lg font-bold text-slate-900">Upravit profil</h3>

            <div className="flex flex-col items-center gap-3">
              <div className="w-24 h-24 rounded-full overflow-hidden border border-slate-200 relative bg-slate-100">
                {previewAvatarUrl ? (
                  <img src={previewAvatarUrl} alt="Avatar preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Změnit profilovou fotku
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-600 block mb-1">Uživatelské jméno</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Jméno a příjmení</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-600 block mb-1">Webová stránka</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-slate-900"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Zrušit
              </button>
              <button
                disabled={saving}
                onClick={handleSaveProfile}
                className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 rounded-xl transition shadow-xs disabled:opacity-50"
              >
                {saving ? 'Ukládám...' : 'Uložit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}