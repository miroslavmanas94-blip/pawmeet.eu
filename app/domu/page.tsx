'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

// --- TYPY ---
type Post = {
  id: string
  created_at: string
  caption: string
  media_url: string
  media_type: 'image' | 'video'
  location?: string
  pet_tag?: string
  likes_count: number
  profiles: { username: string; avatar_url: string }
}

export default function HomeFeed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  
  // 1. REAL-TIME SYNCHRONIZACE & NAČTENÍ DAT
  useEffect(() => {
    // ⚠️ Supabase klienta vytvoříme až uvnitř useEffectu,
    // takže se na serveru při buildu vůbec nespustí!
    const supabase = createClient()

    const fetchInitialPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(username, avatar_url)')
        .order('created_at', { ascending: false })
        .range(0, 5) // Prvních 5 pro rychlý start

      if (!error && data) {
        setPosts(data as any)
      }
      setLoading(false)
    }

    fetchInitialPosts()

    // Kanál pro sledování změn v reálném čase
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          const newPost = payload.new as Post
          setPosts((current) => [newPost, ...current])
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'posts' },
        (payload) => {
          setPosts((current) =>
            current.map((p) => (p.id === payload.new.id ? { ...p, ...payload.new } : p))
          )
        }
      )
      .subscribe()

    return () => { 
      supabase.removeChannel(channel) 
    }
  }, [])

  // 2. NEKONEČNÝ FEED
  const loadMore = async () => {
    const supabase = createClient() // Bezpečné i zde uvnitř funkce
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
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white pb-24">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-900 px-4 py-4">
        <div className="max-w-lg mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            PawMeet
          </h1>
          <div className="flex gap-4 items-center">
            <button className="text-xl">❤️</button>
            <button className="text-xl">💬</button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto pt-4 px-2">
        
        {/* STORIES SECTION */}
        <section className="flex gap-4 overflow-x-auto no-scrollbar pb-4 border-b border-gray-100 dark:border-gray-900">
          <div className="flex flex-col items-center gap-1 flex-shrink-0">
            <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center border-2 border-indigo-500 p-0.5">
              <div className="bg-white dark:bg-black w-full h-full rounded-full flex items-center justify-center text-xl">＋</div>
            </div>
            <span className="text-[10px] font-medium">Tvůj příběh</span>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-yellow-400 to-purple-600 p-0.5">
                <div className="bg-white dark:bg-black w-full h-full rounded-full flex items-center justify-center text-2xl overflow-hidden">
                  🐶
                </div>
              </div>
              <span className="text-[10px] font-medium">Rex {i}</span>
            </div>
          ))}
        </section>

        {/* CREATE POST BOX */}
        <div className="my-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-500"></div>
          <Link href="/posts/new" className="flex-1 text-gray-400 text-sm">
            Sdílej dnešní zážitek svého mazlíčka...
          </Link>
          <span className="text-xl">📸</span>
        </div>

        {/* FEED */}
        <div className="flex flex-col gap-8">
          {posts.map((post) => (
            <article key={post.id} className="flex flex-col gap-3">
              <div className="flex justify-between items-center px-2">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center">🐾</div>
                  <div>
                    <h4 className="text-sm font-bold">{post.profiles?.username || 'Uživatel'}</h4>
                    {post.location && <p className="text-[10px] text-indigo-500 font-semibold">📍 {post.location}</p>}
                  </div>
                </div>
                <button className="text-gray-400">•••</button>
              </div>

              <div className="w-full aspect-[4/5] bg-gray-100 dark:bg-gray-900 rounded-3xl overflow-hidden relative group">
                {post.media_type === 'video' ? (
                  <video src={post.media_url} autoPlay muted loop className="w-full h-full object-cover" />
                ) : (
                  <img src={post.media_url || 'https://via.placeholder.com/600'} className="w-full h-full object-cover" alt="Post media" />
                )}
                
                {post.pet_tag && (
                  <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-md text-white text-[10px] px-3 py-1 rounded-full border border-white/20">
                    🐾 {post.pet_tag}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center px-2">
                <div className="flex gap-5 text-2xl">
                  <button className="hover:scale-125 transition-transform">❤️</button>
                  <button className="hover:scale-125 transition-transform">💬</button>
                  <button className="hover:scale-125 transition-transform">↗️</button>
                </div>
                <button className="text-2xl hover:scale-125 transition-transform">🔖</button>
              </div>

              <div className="px-2 flex flex-col gap-1">
                <span className="text-sm font-bold">{post.likes_count} lajků</span>
                <p className="text-sm">
                  <span className="font-bold mr-2">{post.profiles?.username}</span>
                  {post.caption}
                </p>
                <button className="text-gray-400 text-xs mt-1">Zobrazit všech 42 komentářů</button>
              </div>
            </article>
          ))}
          
          {loading && (
             <div className="text-center py-4 text-sm text-gray-500">Načítám smečku... 🐾</div>
          )}
        </div>

        {!loading && (
          <button 
            onClick={loadMore}
            className="w-full py-8 text-indigo-500 font-bold text-sm"
          >
            Načítám další doporučený obsah...
          </button>
        )}
      </main>

      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-white/80 dark:bg-gray-900/80 backdrop-blur-2xl border border-white/20 dark:border-gray-800 rounded-[2.5rem] px-6 py-4 flex justify-around items-center shadow-2xl z-[100]">
        <Link href="/domu" className="text-indigo-500 text-2xl">🏠</Link>
        <Link href="/map" className="text-gray-400 text-2xl">🗺️</Link>
        <Link href="/posts/new" className="bg-gradient-to-r from-indigo-600 to-purple-600 w-14 h-14 rounded-full flex items-center justify-center text-white text-3xl shadow-lg -mt-12 border-4 border-white dark:border-black hover:scale-110 transition-transform">
          ＋
        </Link>
        <Link href="/chat" className="text-gray-400 text-2xl">🐾</Link>
        <Link href="/profile" className="text-gray-400 text-2xl">👤</Link>
      </nav>

    </div>
  )
}