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
    avatar_y: 0
  })

  // Stavy pro úpravu v modálním okně
  const [editForm, setEditForm] = useState<ProfileData>(profile)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

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
          likes_count: post.likes_count || 0
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

        const loadedProfile: ProfileData = {
          id: user.id,
          username: profileData?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'uzivatel',
          full_name: profileData?.full_name || user.user_metadata?.full_name || 'Uživatel',
          avatar_url: profileData?.avatar_url || profileData?.avatar || user.user_metadata?.avatar_url || '',
          bio: profileData?.bio || user.user_metadata?.bio || 'Zatím bez popisu',
          website: profileData?.website || '',
          posts_count: formattedPosts.length,
          followers_count: profileData?.followers_count ?? followersCount,
          following_count: profileData?.following_count ?? followingCount,
          avatar_scale: profileData?.avatar_scale ?? 1,
          avatar_x: profileData?.avatar_x ?? 0,
          avatar_y: profileData?.avatar_y ?? 0
        }

        setProfile(loadedProfile)
        setEditForm(loadedProfile)
        setPreviewAvatarUrl(loadedProfile.avatar_url)
      }
      setLoading(false)
    }

    fetchProfileAndPosts()
  }, [])

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
    // Načteme komentáře pro vybraný příspěvek i následující
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
      setCommentsMap((prev) => ({ ...prev, [postId]: data as CommentItem[] }))
    }
  }

  // --- AKCE: LAJKOVÁNÍ ---
  const handleToggleLike = async (postId: string) => {
    if (!profile.id) return

    const targetPost = posts.find((p) => p.id === postId)
    if (!targetPost) return

    const isLiked = targetPost.is_liked

    // Optimistická aktualizace UI
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              is_liked: !isLiked,
              likes_count: (p.likes_count || 0) + (isLiked ? -1 : 1)
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
        content: text
      })
      .select('*, profiles(username, avatar_url)')
      .single()

    if (!error && data) {
      setCommentsMap((prev) => ({
        ...prev,
        [postId]: [...(prev[postId] || []), data as CommentItem]
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
        updated_at: new Date().toISOString()
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

  const getPostImageUrl = (post: Post) => {
    return post.image_url || post.media_url || post.url || post.photo_url || ''
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-white text-slate-800">
        <div className="animate-spin text-3xl">🌀</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col items-center">
      {/* Hlavní kontejner */}
      <div className="w-full max-w-4xl px-4 py-8 flex-1">
        
        {/* HORNÍ SEKCE: Profilová karta */}
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14 mb-8">
          
          {/* FOTKA S INSTAGRAM PŘÍBĚHOVÝM KRUHEM */}
          <div className="relative group flex-shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-[3px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 shadow-md">
              <div className="w-full h-full rounded-full bg-white p-1">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-100 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover transition-transform"
                      style={{
                        transform: `translate(${profile.avatar_x || 0}px, ${profile.avatar_y || 0}px) scale(${profile.avatar_scale || 1})`
                      }}
                    />
                  ) : (
                    <span className="text-5xl">🐾</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* INFORMACE O UŽIVATELI */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-4">
            
            {/* Radek 1: Nickname + Tlačítka */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">@{profile.username}</h1>
              
              <button
                onClick={handleOpenEdit}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl transition border border-slate-200/60 active:scale-95"
              >
                Upravit profil
              </button>

              <button className="text-lg p-2 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                ⚙️
              </button>
            </div>

            {/* Radek 2: Statistiky */}
            <div className="flex items-center gap-8 py-3 text-sm md:text-base border-y border-slate-100 md:border-none w-full justify-center md:justify-start">
              <div>
                <span className="font-extrabold text-slate-900">{profile.posts_count}</span>{' '}
                <span className="text-slate-500 text-xs md:text-sm">příspěvků</span>
              </div>
              <div>
                <span className="font-extrabold text-slate-900">{profile.followers_count}</span>{' '}
                <span className="text-slate-500 text-xs md:text-sm">sledujících</span>
              </div>
              <div>
                <span className="font-extrabold text-slate-900">{profile.following_count}</span>{' '}
                <span className="text-slate-500 text-xs md:text-sm">sleduji</span>
              </div>
            </div>

            {/* Radek 3: Celé jméno, Bio a Web */}
            <div className="text-sm space-y-1">
              <h2 className="font-bold text-slate-900">{profile.full_name}</h2>
              <p className="whitespace-pre-line text-slate-600 max-w-md leading-relaxed">{profile.bio}</p>
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-blue-600 hover:underline inline-flex items-center gap-1 mt-1"
                >
                  🔗 {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ZÁLOŽKY (Příspěvky / Uložené / Označení) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-1 mb-6 flex justify-center text-xs font-bold tracking-wider text-slate-500">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'posts'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            🖼️ Příspěvky
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'saved'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            🔖 Uložené
          </button>
          <button
            onClick={() => setActiveTab('tagged')}
            className={`flex-1 py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition ${
              activeTab === 'tagged'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            🏷️ Označení
          </button>
        </div>

        {/* OBSAH PODLE VYBRANÉ ZÁLOŽKY */}
        {activeTab === 'posts' && (
          <div className="grid grid-cols-3 gap-2 md:gap-4">
            {posts.length === 0 ? (
              <div className="col-span-3 py-20 bg-white rounded-3xl border border-slate-200/80 text-center text-slate-400">
                <div className="text-5xl mb-3">📸</div>
                <p className="text-base font-bold text-slate-700">Zatím nemáš žádné příspěvky</p>
                <p className="text-xs text-slate-400 mt-1">Sdílej své první fotky s mazlíčkem!</p>
              </div>
            ) : (
              posts.map((post, idx) => {
                const imgUrl = getPostImageUrl(post)
                return (
                  <div
                    key={post.id}
                    onClick={() => handleOpenPostFeed(idx)}
                    className="aspect-square bg-slate-100 rounded-2xl overflow-hidden relative group cursor-pointer border border-slate-200/80 shadow-sm"
                  >
                    {imgUrl ? (
                      <img
                        src={imgUrl}
                        alt="Příspěvek"
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-3xl bg-slate-100">
                        📷
                      </div>
                    )}
                    {/* Hover překryv s počtem lajků a komentářů */}
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-6 font-bold text-white text-sm backdrop-blur-[2px]">
                      <span className="flex items-center gap-1.5">❤️ {post.likes_count || 0}</span>
                      <span className="flex items-center gap-1.5">💬 {post.comments_count || 0}</span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {activeTab === 'saved' && (
          <div className="py-20 bg-white rounded-3xl border border-slate-200/80 text-center text-slate-400">
            <div className="text-5xl mb-3">🔖</div>
            <p className="text-base font-bold text-slate-700">Žádné uložené příspěvky</p>
            <p className="text-xs text-slate-400 mt-1">Uložené příspěvky uvidíš pouze ty.</p>
          </div>
        )}

        {activeTab === 'tagged' && (
          <div className="py-20 bg-white rounded-3xl border border-slate-200/80 text-center text-slate-400">
            <div className="text-5xl mb-3">🏷️</div>
            <p className="text-base font-bold text-slate-700">Fotky s tebou</p>
            <p className="text-xs text-slate-400 mt-1">Až tě někdo označí na fotce, objeví se zde.</p>
          </div>
        )}
      </div>

      {/* DETAIL PŘÍSPĚVKŮ: CONTINUOUS SCROLL FEED MODAL */}
      {selectedPostIndex !== null && (
        <div
          onClick={() => setSelectedPostIndex(null)}
          className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-md flex justify-center items-center p-2 sm:p-4"
        >
          {/* Tlačítko Zavřít */}
          <button
            onClick={() => setSelectedPostIndex(null)}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 z-50 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center text-slate-800 font-bold hover:bg-white shadow-lg transition"
          >
            ✕
          </button>

          {/* Scroll container pro posun mezi příspěvky */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg h-[90vh] overflow-y-auto rounded-3xl space-y-6 pr-1 scrollbar-thin scrollbar-thumb-slate-400"
          >
            {posts.slice(selectedPostIndex).map((post) => {
              const imgUrl = getPostImageUrl(post)
              const postComments = commentsMap[post.id] || []

              return (
                <div
                  key={post.id}
                  className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xl text-slate-900"
                >
                  {/* Hlavička s autorem */}
                  <div className="p-4 flex items-center gap-3 border-b border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shrink-0">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">🐾</div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">@{profile.username}</h4>
                      <p className="text-[10px] text-slate-400">{profile.full_name}</p>
                    </div>
                  </div>

                  {/* Obrázek / Médium */}
                  <div className="w-full aspect-square bg-slate-950 flex items-center justify-center">
                    {imgUrl ? (
                      <img src={imgUrl} alt="Post detail" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl text-slate-600">📷</span>
                    )}
                  </div>

                  {/* Tlačítka interakcí */}
                  <div className="p-4 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleToggleLike(post.id)}
                          className="text-2xl transition-transform active:scale-125"
                        >
                          {post.is_liked ? '❤️' : '🤍'}
                        </button>
                        <span className="text-xs font-extrabold text-slate-900">
                          {post.likes_count || 0} To se mi líbí
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleSave(post.id)}
                        className="text-2xl transition-transform active:scale-125"
                      >
                        {post.is_saved ? '🔖' : '🏷️'}
                      </button>
                    </div>

                    {/* Popisek */}
                    {post.caption && (
                      <div className="text-xs text-slate-700 mt-3 leading-relaxed">
                        <span className="font-bold text-slate-900 mr-1.5">@{profile.username}</span>
                        {post.caption}
                      </div>
                    )}

                    {/* Datum */}
                    {post.created_at && (
                      <div className="text-[10px] text-slate-400 uppercase font-semibold mt-2">
                        {new Date(post.created_at).toLocaleDateString('cs-CZ', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </div>
                    )}
                  </div>

                  {/* Komentáře */}
                  <div className="p-4 bg-slate-50/70 space-y-3">
                    <div className="max-h-40 overflow-y-auto space-y-2 text-xs pr-1">
                      {postComments.length === 0 ? (
                        <p className="text-slate-400 text-[11px] italic">Zatím žádné komentáře.</p>
                      ) : (
                        postComments.map((c) => (
                          <div key={c.id} className="flex gap-2 items-start bg-white p-2 rounded-xl border border-slate-100 shadow-2xs">
                            <span className="font-bold text-slate-900 shrink-0">
                              @{c.profiles?.username || 'Uživatel'}:
                            </span>
                            <span className="text-slate-600">{c.content}</span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Formulář komentáře */}
                    <div className="flex gap-2 pt-2 border-t border-slate-200/70">
                      <input
                        type="text"
                        placeholder="Napište komentář..."
                        value={commentInputs[post.id] || ''}
                        onChange={(e) =>
                          setCommentInputs({ ...commentInputs, [post.id]: e.target.value })
                        }
                        onKeyDown={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                        className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => handleAddComment(post.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-2 rounded-xl text-xs transition shadow-sm active:scale-95"
                      >
                        Odeslat
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODÁLNÍ OKNO: ÚPRAVA PROFILU A VYCENTROVÁNÍ PROFILOVKY */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 md:p-8 shadow-2xl relative my-8 text-slate-900">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-extrabold text-slate-900">Upravit profil</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* 1. SEKCE PROFILOVKY S NASTAVENÍM VYCENTROVÁNÍ */}
            <div className="flex flex-col items-center gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200/80 mb-6">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Úprava fotky</p>
              
              {/* Zobrazovací kruh s živým náhledem */}
              <div className="w-32 h-32 rounded-full overflow-hidden border-2 border-blue-500 relative bg-slate-200 shadow-inner flex items-center justify-center">
                {previewAvatarUrl ? (
                  <img
                    src={previewAvatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover pointer-events-none"
                    style={{
                      transform: `translate(${editForm.avatar_x || 0}px, ${editForm.avatar_y || 0}px) scale(${editForm.avatar_scale || 1})`
                    }}
                  />
                ) : (
                  <span className="text-4xl">🐾</span>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl shadow transition"
              >
                Vybrat novou fotku
              </button>

              {/* POSUVNÍKY PRO VYCENTROVÁNÍ A MĚŘÍTKO */}
              <div className="w-full space-y-3 pt-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                    <span>Přiblížení (Zoom):</span>
                    <span>{Number(editForm.avatar_scale).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={editForm.avatar_scale || 1}
                    onChange={(e) => setEditForm({ ...editForm, avatar_scale: parseFloat(e.target.value) })}
                    className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                      <span>Posun X:</span>
                      <span>{editForm.avatar_x || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editForm.avatar_x || 0}
                      onChange={(e) => setEditForm({ ...editForm, avatar_x: parseInt(e.target.value) })}
                      className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                      <span>Posun Y:</span>
                      <span>{editForm.avatar_y || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editForm.avatar_y || 0}
                      onChange={(e) => setEditForm({ ...editForm, avatar_y: parseInt(e.target.value) })}
                      className="w-full accent-blue-600 bg-slate-200 h-1.5 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. FORMULÁŘ TEXTOVÝCH ÚDAJŮ */}
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Uživatelské jméno (@username)</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Jméno a příjmení</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Bio (O mně)</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Webová stránka</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="https://mojestranka.cz"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* TLAČÍTKA ULOŽIT / ZRUŠIT */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold py-3 rounded-xl transition text-xs text-slate-700"
              >
                Zrušit
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold py-3 rounded-xl transition text-xs text-white shadow-md flex items-center justify-center gap-2"
              >
                {saving ? 'Ukládám...' : 'Uložit změny'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}