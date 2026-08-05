'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

// --- DATOVÉ TYPY ---
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
  text_overlay?: string
  overlay_color?: string
  location?: string
  pet_tag?: string
  likes_count: number
  user_id: string
  profiles: { username: string; avatar_url: string }
}

type Story = {
  id: string
  created_at: string
  media_url: string
  media_type: 'image' | 'video'
  text_overlay?: string
  pet_tag?: string
  user_id: string
  profiles: { username: string; avatar_url: string }
}

// --- JAZYKOVÉ SLOVNÍKY (6 JAZYKŮ) ---
const languages = [
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { code: 'ua', label: 'Українська', flag: '🇺🇦' }
] as const

type LangCode = typeof languages[number]['code']

const translations: Record<LangCode, Record<string, string>> = {
  cs: {
    myStory: 'Váš příběh',
    shareExp: 'Sdílejte zážitek svého mazlíčka...',
    newPost: 'Nový příspěvek',
    newStory: 'Nový příběh',
    caption: 'Napište popisek...',
    textOverlay: 'Text přímo na fotce/videu',
    location: 'Lokalita (např. Park)',
    petName: 'Jméno mazlíčka',
    publish: 'Zveřejnit',
    uploading: 'Nahrávám...',
    comments: 'Komentáře',
    addComment: 'Napište komentář...',
    send: 'Odeslat',
    noComments: 'Zatím žádné komentáře. Buďte první! 🐾',
    loadMore: 'Načíst další příspěvky...',
    likes: 'lajků',
    selectFile: 'Vybrat fotku nebo video',
    saved: 'Uloženo'
  },
  en: {
    myStory: 'Your Story',
    shareExp: "Share your pet's moment...",
    newPost: 'New Post',
    newStory: 'New Story',
    caption: 'Write a caption...',
    textOverlay: 'Text directly on photo/video',
    location: 'Location (e.g., Park)',
    petName: "Pet's name",
    publish: 'Publish',
    uploading: 'Uploading...',
    comments: 'Comments',
    addComment: 'Write a comment...',
    send: 'Send',
    noComments: 'No comments yet. Be the first! 🐾',
    loadMore: 'Load more posts...',
    likes: 'likes',
    selectFile: 'Select photo or video',
    saved: 'Saved'
  },
  pl: {
    myStory: 'Twoja relacja',
    shareExp: 'Podziel się chwilą pupila...',
    newPost: 'Nowy post',
    newStory: 'Nowa relacja',
    caption: 'Napisz podpis...',
    textOverlay: 'Tekst na zdjęciu/wideo',
    location: 'Lokalizacja (np. Park)',
    petName: 'Imię pupila',
    publish: 'Opublikuj',
    uploading: 'Przesyłanie...',
    comments: 'Komentarze',
    addComment: 'Napisz komentarz...',
    send: 'Wyślij',
    noComments: 'Brak komentarzy. Bądź pierwszy! 🐾',
    loadMore: 'Załaduj więcej...',
    likes: 'polubień',
    selectFile: 'Wybierz zdjęcie lub wideo',
    saved: 'Zapisano'
  },
  de: {
    myStory: 'Deine Story',
    shareExp: 'Teile das Erlebnis deines Haustiers...',
    newPost: 'Neuer Beitrag',
    newStory: 'Neue Story',
    caption: 'Bildunterschrift schreiben...',
    textOverlay: 'Text direkt auf Foto/Video',
    location: 'Ort (z. B. Park)',
    petName: 'Name des Haustiers',
    publish: 'Veröffentlichen',
    uploading: 'Wird hochgeladen...',
    comments: 'Kommentare',
    addComment: 'Schreibe einen Kommentar...',
    send: 'Senden',
    noComments: 'Noch keine Kommentare. Sei der Erste! 🐾',
    loadMore: 'Mehr Beiträge laden...',
    likes: 'Gefällt mir',
    selectFile: 'Foto oder Video auswählen',
    saved: 'Gespeichert'
  },
  sk: {
    myStory: 'Váš príbeh',
    shareExp: 'Zdieľajte zážitok svojho miláčika...',
    newPost: 'Nový príspevok',
    newStory: 'Nový príbeh',
    caption: 'Napíšte popisok...',
    textOverlay: 'Text priamo na fotke/videu',
    location: 'Lokalita (napr. Park)',
    petName: 'Meno miláčika',
    publish: 'Zverejniť',
    uploading: 'Nahrávam...',
    comments: 'Komentáre',
    addComment: 'Napíšte komentár...',
    send: 'Odoslať',
    noComments: 'Zatiaľ žiadne komentáre. Buďte prvý! 🐾',
    loadMore: 'Načítať ďalšie príspevky...',
    likes: 'páči sa mi to',
    selectFile: 'Vybrať fotku alebo video',
    saved: 'Uložené'
  },
  ua: {
    myStory: 'Ваша історія',
    shareExp: 'Поділіться моментом вашого улюбленця...',
    newPost: 'Новий допис',
    newStory: 'Нова історія',
    caption: 'Напишіть підпис...',
    textOverlay: 'Текст прямо на фото/відео',
    location: 'Локація (напр., Парк)',
    petName: 'Ім’я улюбленця',
    publish: 'Опублікувати',
    uploading: 'Завантаження...',
    comments: 'Коментарі',
    addComment: 'Напишіть коментар...',
    send: 'Надіслати',
    noComments: 'Поки немає коментарів. Будьте першим! 🐾',
    loadMore: 'Завантажити більше...',
    likes: 'вподобань',
    selectFile: 'Вибрати фото або відео',
    saved: 'Збережено'
  }
}

export default function HomeFeed() {
  // Trvalá volba jazyka z localStorage bez probliknutí
  const [lang, setLang] = useState<LangCode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('lang') as LangCode
      if (saved && translations[saved]) return saved
    }
    return 'cs'
  })
  
  const [isLangOpen, setIsLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Základní stavy pro příspěvky a profil
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [likedPosts, setLikedPosts] = useState<{ [key: string]: boolean }>({})
  const [savedPosts, setSavedPosts] = useState<{ [key: string]: boolean }>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  // Stavy pro modální okna
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<string | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)

  // Stavy pro Tvorbu Příspěvku & Příběhu
  const [isPostModalOpen, setIsPostModalOpen] = useState(false)
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [caption, setCaption] = useState('')
  const [textOverlay, setTextOverlay] = useState('')
  const [overlayColor, setOverlayColor] = useState('#ffffff')
  const [location, setLocation] = useState('')
  const [petTag, setPetTag] = useState('')

  // Prohlížeč Stories
  const [activeStoryIndex, setActiveStoryIndex] = useState<number | null>(null)

  // --- NAČTENÍ FEEDU & STORIES (24H FILTR) ---
  const initFeed = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)

    // 1. Načtení příspěvků
    const { data: postsData } = await supabase
      .from('posts')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .range(0, 5)

    if (postsData) {
      setPosts(postsData as any)

      if (user) {
        const postIds = postsData.map((p: any) => p.id)
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

    // 2. Načtení příběhů (mladší než 24 hodin)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: storiesData } = await supabase
      .from('stories')
      .select('*, profiles(username, avatar_url)')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })

    if (storiesData) {
      setStories(storiesData as any)
    }

    setLoading(false)
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)

    initFeed()

    // Realtime poslech nových příspěvků a stories pro BLESKOVÉ ZOBRAZENÍ VŠEM
    const supabase = createClient()
    const channel = supabase
      .channel('home-feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, async (payload) => {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles(username, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) setPosts((prev) => [data as Post, ...prev])
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'stories' }, async (payload) => {
        const { data } = await supabase
          .from('stories')
          .select('*, profiles(username, avatar_url)')
          .eq('id', payload.new.id)
          .single()
        if (data) setStories((prev) => [data as Story, ...prev])
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Časovač pro automatické přepínání v celoobrazovkovém prohlížeči Stories
  useEffect(() => {
    if (activeStoryIndex === null) return
    const timer = setTimeout(() => {
      if (activeStoryIndex < stories.length - 1) {
        setActiveStoryIndex(activeStoryIndex + 1)
      } else {
        setActiveStoryIndex(null)
      }
    }, 5000)
    return () => clearTimeout(timer)
  }, [activeStoryIndex, stories.length])

  // Změna jazyka
  const selectLanguage = (code: LangCode) => {
    setLang(code)
    localStorage.setItem('lang', code)
    setIsLangOpen(false)
  }

  const t = translations[lang]
  const currentLangObj = languages.find((l) => l.code === lang) || languages[0]

  // Výběr souboru pro příspěvek/story
  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMediaFile(file)
    setMediaType(file.type.startsWith('video') ? 'video' : 'image')
    setMediaPreview(URL.createObjectURL(file))
  }

  // Upload média do Supabase Storage
  const uploadMediaToStorage = async (file: File) => {
    const supabase = createClient()
    const ext = file.name.split('.').pop()
    const path = `uploads/${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    const { error } = await supabase.storage.from('media').upload(path, file)
    if (error) throw error
    const { data } = supabase.storage.from('media').getPublicUrl(path)
    return data.publicUrl
  }

  // Publikace nového Příspěvku
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaFile || !currentUserId) return
    setUploading(true)

    try {
      const mediaUrl = await uploadMediaToStorage(mediaFile)
      const supabase = createClient()

      await supabase.from('posts').insert({
        user_id: currentUserId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption,
        text_overlay: textOverlay,
        overlay_color: overlayColor,
        location,
        pet_tag: petTag,
        likes_count: 0
      })

      // Reset a zavření modalu
      setIsPostModalOpen(false)
      setMediaFile(null)
      setMediaPreview(null)
      setCaption('')
      setTextOverlay('')
      setLocation('')
      setPetTag('')
    } catch (err) {
      alert('Chyba při nahrávání příspěvku.')
    } finally {
      setUploading(false)
    }
  }

  // Publikace nového Příběhu (Story)
  const handleCreateStory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!mediaFile || !currentUserId) return
    setUploading(true)

    try {
      const mediaUrl = await uploadMediaToStorage(mediaFile)
      const supabase = createClient()

      await supabase.from('stories').insert({
        user_id: currentUserId,
        media_url: mediaUrl,
        media_type: mediaType,
        text_overlay: textOverlay,
        pet_tag: petTag
      })

      setIsStoryModalOpen(false)
      setMediaFile(null)
      setMediaPreview(null)
      setTextOverlay('')
      setPetTag('')
    } catch (err) {
      alert('Chyba při nahrávání příběhu.')
    } finally {
      setUploading(false)
    }
  }

  // Lajkování
  const handleLike = async (postId: string, currentCount: number) => {
    if (!currentUserId) return
    const supabase = createClient()
    const isLiked = likedPosts[postId]
    const newLikedState = !isLiked
    const newCount = newLikedState ? currentCount + 1 : Math.max(0, currentCount - 1)

    setLikedPosts((prev) => ({ ...prev, [postId]: newLikedState }))
    setPosts((prev) => prev.map((p) => (p.id === postId ? { ...p, likes_count: newCount } : p)))

    if (newLikedState) {
      await supabase.from('likes').insert({ user_id: currentUserId, post_id: postId })
    } else {
      await supabase.from('likes').delete().eq('user_id', currentUserId).eq('post_id', postId)
    }
    await supabase.from('posts').update({ likes_count: newCount }).eq('id', postId)
  }

  // Uložení příspěvku (Bookmark)
  const handleBookmark = (postId: string) => {
    setSavedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }))
  }

  // Sdílení příspěvku
  const handleShare = async (postId: string) => {
    const url = `${window.location.origin}/domu#post-${postId}`
    if (navigator.share) {
      await navigator.share({ title: 'PawMeet', url })
    } else {
      await navigator.clipboard.writeText(url)
      alert(t.saved)
    }
  }

  // Otvírání a posílání komentářů
  const openComments = async (postId: string) => {
    setActiveCommentsPostId(postId)
    setLoadingComments(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    if (data) setComments(data as any)
    setLoadingComments(false)
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !activeCommentsPostId || !currentUserId) return
    const supabase = createClient()
    const text = newComment.trim()
    setNewComment('')

    const { error } = await supabase.from('comments').insert({
      post_id: activeCommentsPostId,
      user_id: currentUserId,
      content: text
    })
    if (!error) openComments(activeCommentsPostId)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 text-neutral-900 pb-28 selection:bg-indigo-500 selection:text-white">
      
      {/* HLAVIČKA A VÝBĚR JAZYKA */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-neutral-200/60 px-4 py-3.5">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            PawMeet
          </h1>

          <div className="flex gap-3 items-center">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-xs font-bold hover:scale-105 transition-transform shadow-sm border border-neutral-200"
              >
                <span>{currentLangObj.flag}</span>
                <span className="uppercase">{currentLangObj.code}</span>
                <span className={`text-[10px] transition-transform ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border border-neutral-200 shadow-xl overflow-hidden py-1.5 z-50">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => selectLanguage(item.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left hover:bg-indigo-50 transition-colors ${
                        lang === item.code ? 'bg-indigo-50/90 text-indigo-600 font-bold' : 'text-neutral-700'
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
        
        {/* INSTAGRAM STORIES LIŠTA (Expirace 24h) */}
        <section className="flex gap-4 overflow-x-auto no-scrollbar pb-4 pt-1 px-4 sm:px-0 border-b border-neutral-200/60">
          {/* Tlačítko Přidat příběh */}
          <div 
            onClick={() => setIsStoryModalOpen(true)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center border-2 border-dashed border-indigo-600 p-0.5 group-hover:scale-105 transition-transform">
              <div className="bg-indigo-50 w-full h-full rounded-full flex items-center justify-center text-lg text-indigo-600 font-bold">＋</div>
            </div>
            <span className="text-[11px] font-semibold text-neutral-600">{t.myStory}</span>
          </div>

          {/* Seznam nahraných 24h příběhů */}
          {stories.map((story, idx) => (
            <div 
              key={story.id} 
              onClick={() => setActiveStoryIndex(idx)}
              className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group"
            >
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 p-0.5 group-hover:scale-105 transition-transform">
                <div className="bg-white w-full h-full rounded-full flex items-center justify-center overflow-hidden border-2 border-white">
                  {story.profiles?.avatar_url ? (
                    <img src={story.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                  ) : (
                    '🐶'
                  )}
                </div>
              </div>
              <span className="text-[11px] font-semibold text-neutral-600 truncate max-w-[64px]">
                {story.profiles?.username || 'User'}
              </span>
            </div>
          ))}
        </section>

        {/* VYTVOŘIT PŘÍSPĚVEK LIŠTA */}
        <div 
          onClick={() => setIsPostModalOpen(true)}
          className="my-3 mx-4 sm:mx-0 p-3.5 bg-white rounded-2xl flex items-center gap-3 border border-neutral-200/60 shadow-sm cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">🐾</div>
          <span className="flex-1 text-neutral-400 text-sm font-medium">
            {t.shareExp}
          </span>
          <span className="text-xl hover:scale-110 transition-transform">📸</span>
        </div>

        {/* FEED PŘÍSPĚVKŮ */}
        <div className="flex flex-col gap-6 mt-4">
          {posts.map((post) => {
            const isLiked = likedPosts[post.id]
            const isSaved = savedPosts[post.id]

            return (
              <article key={post.id} id={`post-${post.id}`} className="bg-white sm:rounded-3xl border-y sm:border border-neutral-200/60 overflow-hidden shadow-sm">
                
                {/* Hlavička příspěvku */}
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

                {/* Média + TEXT NA FOTCE/VIDEU */}
                <div className="w-full aspect-[4/5] bg-neutral-100 relative overflow-hidden flex items-center justify-center">
                  {post.media_type === 'video' ? (
                    <video src={post.media_url} autoPlay muted loop className="w-full h-full object-cover" />
                  ) : (
                    <img src={post.media_url} className="w-full h-full object-cover" alt="Post media" />
                  )}

                  {/* Textový překryv (Insta Reels/Story Style) */}
                  {post.text_overlay && (
                    <div 
                      className="absolute px-4 py-2 rounded-xl backdrop-blur-md bg-black/40 text-center font-black text-lg max-w-[85%] border border-white/20 shadow-2xl animate-in zoom-in-95"
                      style={{ color: post.overlay_color || '#ffffff' }}
                    >
                      {post.text_overlay}
                    </div>
                  )}

                  {/* Označení mazlíčka */}
                  {post.pet_tag && (
                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-semibold px-3 py-1 rounded-full border border-white/10 shadow-lg">
                      🐾 {post.pet_tag}
                    </div>
                  )}
                </div>

                {/* Tlačítka akci */}
                <div className="flex justify-between items-center px-4 pt-3 pb-1">
                  <div className="flex gap-4 text-2xl items-center">
                    <button onClick={() => handleLike(post.id, post.likes_count)} className="hover:scale-125 active:scale-90 transition-transform">
                      {isLiked ? '❤️' : '🤍'}
                    </button>
                    <button onClick={() => openComments(post.id)} className="hover:scale-125 active:scale-90 transition-transform">
                      💬
                    </button>
                    <button onClick={() => handleShare(post.id)} className="hover:scale-125 active:scale-90 transition-transform">
                      ↗️
                    </button>
                  </div>
                  <button onClick={() => handleBookmark(post.id)} className="text-2xl hover:scale-125 active:scale-90 transition-transform">
                    {isSaved ? '🏷️' : '🔖'}
                  </button>
                </div>

                {/* Popis a Počet lajků */}
                <div className="px-4 pb-4 pt-1 flex flex-col gap-1">
                  <span className="text-xs font-bold tracking-tight">{post.likes_count} {t.likes}</span>
                  {post.caption && (
                    <p className="text-xs leading-relaxed">
                      <span className="font-bold mr-2">{post.profiles?.username}</span>
                      {post.caption}
                    </p>
                  )}
                  <button onClick={() => openComments(post.id)} className="text-neutral-400 text-[11px] font-medium text-left mt-1 hover:underline">
                    {t.comments}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </main>

      {/* --- MODÁLNÍ OKNO: NOVÝ PŘÍSPĚVEK (s textem na fotce) --- */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-neutral-200">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-neutral-200">
              <h3 className="font-bold text-sm">{t.newPost}</h3>
              <button onClick={() => setIsPostModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 font-bold text-xs">✕</button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-4">
              {/* Výběr souboru / Náhled */}
              <div className="relative aspect-square bg-neutral-100 rounded-2xl overflow-hidden border border-dashed border-neutral-300 flex items-center justify-center">
                {mediaPreview ? (
                  <>
                    {mediaType === 'video' ? (
                      <video src={mediaPreview} autoPlay muted loop className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                    )}
                    {textOverlay && (
                      <div 
                        className="absolute px-4 py-2 rounded-xl backdrop-blur-md bg-black/40 text-center font-black text-lg max-w-[85%]"
                        style={{ color: overlayColor }}
                      >
                        {textOverlay}
                      </div>
                    )}
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                    <span className="text-3xl">📸</span>
                    <span className="text-xs font-bold text-indigo-600">{t.selectFile}</span>
                    <input type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" required />
                  </label>
                )}
              </div>

              {/* Vstup pro text NA fotce */}
              <div>
                <label className="text-[11px] font-bold text-neutral-500 uppercase">{t.textOverlay}</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="text"
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                    placeholder="Napište text na fotku..."
                    className="flex-1 px-3 py-2 bg-neutral-100 text-xs rounded-xl outline-none"
                  />
                  <input
                    type="color"
                    value={overlayColor}
                    onChange={(e) => setOverlayColor(e.target.value)}
                    className="w-9 h-9 rounded-xl border-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Popisek, Lokace, Mazlíček */}
              <input
                type="text"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder={t.caption}
                className="w-full px-3 py-2 bg-neutral-100 text-xs rounded-xl outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder={t.location}
                  className="px-3 py-2 bg-neutral-100 text-xs rounded-xl outline-none"
                />
                <input
                  type="text"
                  value={petTag}
                  onChange={(e) => setPetTag(e.target.value)}
                  placeholder={t.petName}
                  className="px-3 py-2 bg-neutral-100 text-xs rounded-xl outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !mediaFile}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs rounded-2xl disabled:opacity-50 shadow-lg shadow-indigo-500/20"
              >
                {uploading ? t.uploading : t.publish}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MODÁLNÍ OKNO: NOVÝ PŘÍBĚH (STORY) --- */}
      {isStoryModalOpen && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-neutral-200">
            <div className="flex justify-between items-center px-5 py-3.5 border-b border-neutral-200">
              <h3 className="font-bold text-sm">{t.newStory}</h3>
              <button onClick={() => setIsStoryModalOpen(false)} className="w-8 h-8 rounded-full bg-neutral-100 font-bold text-xs">✕</button>
            </div>

            <form onSubmit={handleCreateStory} className="p-5 space-y-4">
              <div className="relative aspect-[9/16] max-h-[350px] bg-neutral-100 rounded-2xl overflow-hidden border border-dashed border-neutral-300 flex items-center justify-center mx-auto">
                {mediaPreview ? (
                  <>
                    {mediaType === 'video' ? (
                      <video src={mediaPreview} autoPlay muted loop className="w-full h-full object-cover" />
                    ) : (
                      <img src={mediaPreview} className="w-full h-full object-cover" alt="Preview" />
                    )}
                    {textOverlay && (
                      <div className="absolute px-4 py-2 rounded-xl backdrop-blur-md bg-black/40 text-white text-center font-black text-lg max-w-[85%]">
                        {textOverlay}
                      </div>
                    )}
                  </>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-2 p-4 text-center">
                    <span className="text-3xl">🤳</span>
                    <span className="text-xs font-bold text-indigo-600">{t.selectFile}</span>
                    <input type="file" accept="image/*,video/*" onChange={handleMediaSelect} className="hidden" required />
                  </label>
                )}
              </div>

              <input
                type="text"
                value={textOverlay}
                onChange={(e) => setTextOverlay(e.target.value)}
                placeholder={t.textOverlay}
                className="w-full px-3 py-2 bg-neutral-100 text-xs rounded-xl outline-none"
              />
              <input
                type="text"
                value={petTag}
                onChange={(e) => setPetTag(e.target.value)}
                placeholder={t.petName}
                className="w-full px-3 py-2 bg-neutral-100 text-xs rounded-xl outline-none"
              />

              <button
                type="submit"
                disabled={uploading || !mediaFile}
                className="w-full py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-yellow-500 text-white font-bold text-xs rounded-2xl disabled:opacity-50 shadow-lg"
              >
                {uploading ? t.uploading : t.publish}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- CELOOBRAZOVKOVÝ PROHLÍŽEČ STORIES --- */}
      {activeStoryIndex !== null && stories[activeStoryIndex] && (
        <div className="fixed inset-0 z-[300] bg-black flex items-center justify-center">
          <div className="relative w-full max-w-md h-full sm:h-[90vh] bg-neutral-900 sm:rounded-3xl overflow-hidden flex flex-col justify-between">
            
            {/* Progress bar nahoře */}
            <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
              {stories.map((_, idx) => (
                <div key={idx} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-white transition-all duration-300 ${
                      idx === activeStoryIndex ? 'w-full animate-pulse' : idx < activeStoryIndex ? 'w-full' : 'w-0'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Autor story */}
            <div className="absolute top-7 left-4 z-10 flex items-center gap-2 text-white">
              <div className="w-8 h-8 rounded-full bg-neutral-700 overflow-hidden border border-white/20">
                {stories[activeStoryIndex].profiles?.avatar_url && (
                  <img src={stories[activeStoryIndex].profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />
                )}
              </div>
              <span className="text-xs font-bold">{stories[activeStoryIndex].profiles?.username}</span>
            </div>

            {/* Zavření */}
            <button 
              onClick={() => setActiveStoryIndex(null)}
              className="absolute top-6 right-4 z-10 text-white text-lg w-8 h-8 flex items-center justify-center font-bold"
            >
              ✕
            </button>

            {/* Média + Overlay */}
            <div className="w-full h-full flex items-center justify-center relative">
              {stories[activeStoryIndex].media_type === 'video' ? (
                <video src={stories[activeStoryIndex].media_url} autoPlay muted loop className="w-full h-full object-cover" />
              ) : (
                <img src={stories[activeStoryIndex].media_url} className="w-full h-full object-cover" alt="Story" />
              )}

              {stories[activeStoryIndex].text_overlay && (
                <div className="absolute px-5 py-2.5 rounded-2xl backdrop-blur-md bg-black/50 text-white text-center font-black text-xl max-w-[80%]">
                  {stories[activeStoryIndex].text_overlay}
                </div>
              )}
            </div>

            {/* Přepínací dotykové zóny (vlevo / vpravo) */}
            <div 
              onClick={() => setActiveStoryIndex(Math.max(0, activeStoryIndex - 1))}
              className="absolute top-0 bottom-0 left-0 w-1/3 z-20"
            />
            <div 
              onClick={() => {
                if (activeStoryIndex < stories.length - 1) setActiveStoryIndex(activeStoryIndex + 1)
                else setActiveStoryIndex(null)
              }}
              className="absolute top-0 bottom-0 right-0 w-2/3 z-20"
            />
          </div>
        </div>
      )}

      {/* --- MODÁLNÍ OKNO PRO KOMENTÁŘE --- */}
      {activeCommentsPostId && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-lg h-[80vh] sm:h-[600px] rounded-t-[2.5rem] sm:rounded-3xl flex flex-col overflow-hidden border border-neutral-200 shadow-2xl">
            <div className="flex justify-between items-center px-6 py-4 border-b border-neutral-200">
              <h3 className="font-bold text-sm">{t.comments}</h3>
              <button onClick={() => setActiveCommentsPostId(null)} className="w-8 h-8 rounded-full bg-neutral-100 font-bold text-xs">✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {loadingComments ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : comments.length === 0 ? (
                <p className="text-center text-neutral-400 text-xs py-10">{t.noComments}</p>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-200 overflow-hidden flex-shrink-0">
                      {c.profiles?.avatar_url && <img src={c.profiles.avatar_url} className="w-full h-full object-cover" alt="avatar" />}
                    </div>
                    <div className="flex-1 bg-neutral-50 p-3 rounded-2xl text-xs">
                      <span className="font-bold mr-2">{c.profiles?.username || 'Uživatel'}</span>
                      <span className="text-neutral-700">{c.content}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleAddComment} className="p-4 border-t border-neutral-200 flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={t.addComment}
                className="flex-1 px-4 py-3 rounded-2xl bg-neutral-100 text-xs outline-none"
              />
              <button type="submit" className="px-5 py-3 bg-indigo-600 text-white font-bold text-xs rounded-2xl">
                {t.send}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SPODNÍ PLOVOUCÍ NAVIGACE */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/85 backdrop-blur-2xl border border-neutral-200/80 rounded-[2.5rem] px-6 py-3.5 flex justify-around items-center shadow-2xl z-[100]">
        <Link href="/domu" className="text-indigo-600 text-2xl hover:scale-110 transition-transform">🏠</Link>
        <Link href="/map" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">🗺️</Link>
        <button onClick={() => setIsPostModalOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl shadow-lg shadow-indigo-500/30 -mt-10 border-4 border-white hover:scale-110 active:scale-95 transition-all">
          ＋
        </button>
        <Link href="/chat" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">🐾</Link>
        <Link href="/profile" className="text-neutral-400 hover:text-neutral-600 text-2xl hover:scale-110 transition-transform">👤</Link>
      </nav>

    </div>
  )
}