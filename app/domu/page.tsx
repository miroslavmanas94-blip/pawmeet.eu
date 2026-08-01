'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { translations, languages } from '@/utils/translations'

type Comment = {
  id: string
  content: string
  created_at: string
  profiles: { username: string; avatar_url: string }
}

type Post = {
  id: string
  created_at: string
  caption: string
  media_url: string
  media_type: 'image' | 'video'
  location?: string
  pet_tag?: string
  likes_count: number
  user_id: string
  profiles: { username: string; avatar_url: string }
}

export default function HomeFeed() {
  // Okamžité načtení uloženého jazyka při startu komponenty (eliminace probliknutí)
  const [lang, setLang] = useState<typeof languages[number]['code']>(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('lang') as typeof languages[number]['code']
      if (savedLang && languages.some(l => l.code === savedLang)) {
        return savedLang
      }
    }
    return 'cs'
  })
  
  const [isLangOpen, setIsLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({})
  
  const [activePostId, setActivePostId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  const initFeed = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)

    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .range(0, 5)

    if (!error && data) {
      setPosts(data as any)

      if (user) {
        const postIds = data.map((p: any) => p.id)
        const { data: likesData } = await supabase
          .from('likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postIds)

        if (likesData) {
          const likedMap: { [key: string]: boolean } = {}
          likesData.forEach((l: any) => { likedMap[l.post_id] = true })
          setLikedPosts(likedMap)
        }
      }
    }
    setLoading(false)
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    initFeed()

    // Automatické načtení nejnovějších příspěvků při návratu na záložku/stránku (např. po vytvoření příspěvku)
    const handleFocus = () => {
      initFeed()
    }
    window.addEventListener('focus', handleFocus)

    const supabase = createClient()
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'posts' }, 
        async (payload) => {
          const { data, error } = await supabase
            .from('posts')
            .select('*, profiles(username, avatar_url)')
            .eq('id', payload.new.id)
            .single()

          if (!error && data) {
            setPosts((current) => [data as Post, ...current])
          }
        }
      )
      .on(
        'postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'posts' }, 
        (payload) => {
          setPosts((current) => current.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p)))
        }
      )
      .subscribe()

    return () => { 
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const selectLanguage = (code: typeof languages[number]['code']) => {
    setLang(code)
    localStorage.setItem('lang', code)
    setIsLangOpen(false)
  }

  const t = translations[lang]
  const currentLangObj = languages.find(l => l.code === lang) || languages[0]

  const handleLike = async (postId: string, currentCount: number) => {
    const supabase = createClient()
    if (!currentUserId) return

    const isLiked = likedPosts[postId]
    const newLikedState = !isLiked
    const newCount = newLikedState ? currentCount + 1 : Math.max(0, currentCount - 1)

    setLikedPosts((prev) => ({ ...prev, [postId]: newLikedState }))
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: newCount } : p))

    if (newLikedState) {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId })
    } else {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId)
    }

    await supabase.from('posts').update({ likes_count: newCount }).eq('id', postId)
  }

  const openComments = async (postId: string) => {
    setActivePostId(postId)
    setLoadingComments(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (!error && data) {
      setComments(data as any)
    }
    setLoadingComments(false)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !activePostId || !currentUserId) return

    const supabase = createClient()
    const text = newComment.trim()
    setNewComment('')

    const { error } = await supabase.from('comments').insert({
      post_id: activePostId,
      user_id: currentUserId,
      content: text
    })

    if (!error) {
      openComments(activePostId)
    }
  }

  const loadMore = async () => {
    const supabase = createClient()
    const nextStep = page + 1
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .range(nextStep * 6, (nextStep + 1) * 6)

    if (!error && data && data.length > 0) {
      setPosts((prev) => [...prev, ...(data as any)])
      setPage(nextStep)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 text-neutral-900 pb-28 selection:bg-indigo-500 selection:text-white">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 px-4 py-3.5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            PawMeet
          </h1>
          
          <div className="flex gap-3 items-center">
            {/* Jazykový výběr */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white text-xs font-bold hover:scale-105 transition-transform shadow-sm border border-gray-200"
              >
                <span>{currentLangObj.flag}</span>
                <span className="uppercase">{currentLangObj.code}</span>
                <span className={`text-[10px] transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden py-1.5 z-50">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => selectLanguage(item.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left hover:bg-indigo-50 transition-colors ${
                        lang === item.code ? 'bg-indigo-50/85 text-indigo-600 font-bold' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-base">{item.flag}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link href="/chat" className="text-xl hover:scale-110 active:scale-90 transition-transform p-1">💬</Link>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto pt-3 px-0 sm:px-2">
        
        {/* STORIES */}
        <section className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pt-1 px-4 sm:px-0 border-b border-neutral-200/60">
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center border-2 border-indigo-600 p-0.5 group-hover:scale-105 transition-transform">
              <div className="bg-white w-full h-full rounded-full flex items-center justify-center text-lg text-indigo-600 font-bold">＋</div>
            </div>
            <span className="text-[11px] font-semibold text-neutral-600">{t.myStory}</span>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-0.5 group-hover:scale-105 transition-transform">
                <div className="bg-white w-full h-full rounded-full flex items-center justify-center text-2xl overflow-hidden border-2 border-white">
                  🐶
                </div>
              </div>
              <span className="text-[11px] font-semibold text-neutral-600">{t.petPrefix} {i}</span>
            </div>
          ))}
        </section>

        {/* CREATE POST BAR */}
        <div className="my-3 mx-4 sm:mx-0 p-3.5 bg-white backdrop-blur-md rounded-2xl flex items-center gap-3 border border-neutral-200/60 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">🐾</div>
          <Link href="/posts/new" className="flex-1 text-neutral-400 text-sm font-medium hover:text-neutral-600 transition-colors">
            {t.shareExperience}
          </Link>
          <span className="text-xl cursor-pointer hover:scale-110 transition-transform">📸</span>
        </div>

        {/* FEED */}
        <div className="flex flex-col gap-6 mt-4">
          {posts.map((post) => {
            const isLiked = likedPosts[post.id]
            return (
              <article key={post.id} className="bg-white sm:rounded-3xl border-y sm:border border-neutral-200/60 overflow-hidden shadow-sm">
                
                {/* Autor */}
                <div className="flex justify-between items-center px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-neutral-200 flex items-center justify-center text-sm overflow-hidden border border-neutral-200">
                      {post.profiles?.avatar_url ? (
                        <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="Avatar" />
                      ) : (
                        '🐾'
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold tracking-tight">{post.profiles?.username || 'Uživatel'}</h4>
                      {post.location && <p className="text-[10px] text-indigo-600 font-semibold">📍 {post.location}</p>}
                    </div>
                  </div>
                  <button className="text-neutral-400 hover:text-neutral-600 font-bold px-2">•••</button>
                </div>

                {/* Média */}
                <div className="w-full aspect-[4/5] bg-neutral-100 relative overflow-hidden">
                  {post.media_type === 'video' ? (
                    <video src={post.media_url} autoPlay muted loop className="w-full h-full object-cover" />
                  ) : (
                    <img src={post.media_url} className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-500" alt="Post media" />
                  )}
                  
                  {post.pet_tag && (
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-3 py-1 rounded-full border border-white/10 shadow-lg">
                      🐾 {post.pet_tag}
                    </div>
                  )}
                </div>

                {/* Akční tlačítka */}
                <div className="flex justify-between items-center px-4 pt-3 pb-1">
                  <div className="flex gap-4 text-2xl items-center">
                    <button 
                      onClick={() => handleLike(post.id, post.likes_count)}
                      className="hover:scale-125 active:scale-90 transition-transform"
                    >
                      {isLiked ? '❤️' : '🤍'}
                    </button>
                    <button 
                      onClick={() => openComments(post.id)}
                      className="hover:scale-125 active:scale-90 transition-transform"
                    >
                      💬
                    </button>
                    <button className="hover:scale-125 active:scale-90 transition-transform">↗️</button>
                  </div>
                  <button className="text-2xl hover:scale-125 active:scale-90 transition-transform">🔖</button>
                </div>

                {/* Popis a lajky */}
                <div className="px-4 pb-4 pt-1 flex flex-col gap-1">
                  <span className="text-xs font-bold tracking-tight">{post.likes_count} lajků</span>
                  <p className="text-xs leading-relaxed">
                    <span className="font-bold mr-2">{post.profiles?.username}</span>
                    {post.caption}
                  </p>
                  <button 
                    onClick={() => openComments(post.id)}
                    className="text-neutral-400 text-[11px] font-medium text-left mt-1 hover:underline"
                  >
                    Zobrazit komentáře
                  </button>
                </div>
              </article>
            )
          })}
          
          {loading && (
             <div className="flex justify-center items-center py-10">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
             </div>
          )}
        </div>

        {!loading && (
          <button 
            onClick={loadMore}
            className="w-full py-8 text-indigo-600 font-bold text-xs uppercase tracking-wider hover:opacity-80 transition-opacity"
          >
            {t.loadMore}
          </button>
        )}
      </main>

      {/* MODÁLNÍ OKNO PRO KOMENTÁŘE */}
      {activePostId && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg h-[80vh] sm:h-[600px] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col overflow-hidden border border-neutral-200 shadow-2xl animate-in slide-in-from-bottom duration-300">
            
            {/* Hlavička modalu */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200">
              <h3 className="font-bold text-sm">Komentáře</h3>
              <button 
                onClick={() => setActivePostId(null)}
                className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Seznam komentářů */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-neutral-400 text-xs py-10">Zatím žádné komentáře. Buď první! 🐾</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-xs">
                      {c.profiles?.avatar_url ? (
                        <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                      ) : (
                        '🐾'
                      )}
                    </div>
                    <div className="flex-1 bg-neutral-50 p-3 rounded-2xl text-xs">
                      <span className="font-bold mr-2">{c.profiles?.username || 'Uživatel'}</span>
                      <span className="text-neutral-700">{c.content}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Vložení nového komentáře */}
            <form onSubmit={handleAddComment} className="p-4 border-t border-neutral-200 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Napiš komentář..."
                className="flex-1 px-4 py-3 rounded-2xl bg-neutral-100 text-xs outline-none border border-transparent focus:border-indigo-500"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-indigo-600 text-white font-bold text-xs rounded-2xl hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20"
              >
                Odeslat
              </button>
            </form>

          </div>
        </div>
      )}

      {/* PLOVOUCÍ SPODNÍ NAVIGACE */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/85 backdrop-blur-2xl border border-neutral-200/80 rounded-[2.5rem] px-6 py-3.5 flex justify-around items-center shadow-2xl z-[100]">
        <Link href="/domu" className="text-indigo-600 text-2xl hover:scale-110 transition-transform">🏠</Link>
        <Link href="/map" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">🗺️</Link>
        <Link href="/posts/new" className="bg-gradient-to-r from-indigo-600 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30 -mt-10 border-4 border-white hover:scale-110 active:scale-95 transition-all">
          ＋
        </Link>
        <Link href="/chat" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">🐾</Link>
        <Link href="/profile" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">👤</Link>
      </nav>

    </div>
  )
}