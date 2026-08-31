'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { translations, languages } from '@/utils/translations'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

type TabType = 'stories' | 'map' | 'chat' | 'ai'
type ModalType = 'terms' | 'privacy' | 'reviews' | null

interface Review {
  id: number
  author: string
  rating: number
  text: string
  created_at: string
}

export function PawLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <img 
      src="/logo.png" 
      alt="PawMeet Logo" 
      className={`rounded-2xl shadow-xl shadow-purple-500/10 object-cover shrink-0 border border-purple-500/20 ${className}`}
    />
  )
}

export default function LandingPage() {
  const [lang, setLang] = useState<typeof languages[number]['code']>('cs')
  const [isLangOpen, setIsLangOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('stories')
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [modalContent, setModalContent] = useState<ModalType>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [mounted, setMounted] = useState(false)
  const [rating, setRating] = useState<number>(4.5)
  const [reviewText, setReviewText] = useState<string>('')
  const [submitted, setSubmitted] = useState<boolean>(false)
  const [loading, setLoading] = useState<boolean>(true)
  const [reviewsList, setReviewsList] = useState<Review[]>([])

  useEffect(() => {
    setMounted(true)
    fetchReviews()

    const savedLang = localStorage.getItem('lang') as typeof languages[number]['code']
    if (savedLang && languages.some(l => l.code === savedLang)) {
      setLang(savedLang)
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchReviews = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error && data) {
      setReviewsList(data)
    }
    setLoading(false)
  }

  const totalRatingCount = reviewsList.length
  const averageRating = totalRatingCount > 0 
    ? (reviewsList.reduce((acc, curr) => acc + curr.rating, 0) / totalRatingCount).toFixed(1)
    : '5.0'

  const selectLanguage = (code: typeof languages[number]['code']) => {
    setLang(code)
    localStorage.setItem('lang', code)
    setIsLangOpen(false)
  }

  const handleRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) return

    const newReview = {
      author: 'Uživatel PawMeet',
      rating: rating,
      text: reviewText.trim() || 'Bez textového komentáře.'
    }

    const { data, error } = await supabase
      .from('reviews')
      .insert([newReview])
      .select()

    if (!error && data) {
      setReviewsList([data[0], ...reviewsList])
      setSubmitted(true)
    }
  }

  const t = translations[lang] || translations['cs']
  const currentLangObj = languages.find(l => l.code === lang) || languages[0]

  const tabData: Record<TabType, {
    icon: string;
    title: string;
    badge: string;
    desc: string;
    mockupHeader: string;
    mockupContent: React.ReactNode;
  }> = {
    stories: {
      icon: '📸',
      title: t?.stories || 'Stories & Fotky',
      badge: 'Sociální feed',
      desc: 'Sdílejte radostné momenty ze života vašich mazlíčků, objevujte příběhy ze sousedství a sbírejte paculky od komunity.',
      mockupHeader: 'Přidáno před 15 minutami • Praha 4',
      mockupContent: (
        <div className="space-y-3.5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 via-indigo-500 to-pink-500 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-sm font-bold">🐶</div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Buddy & Max</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Zlatý retrívr • 2 roky</p>
            </div>
          </div>
          <div className="h-40 rounded-2xl bg-gradient-to-br from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-500/20 flex items-center justify-center text-purple-700 dark:text-purple-300 text-xs font-bold shadow-inner">
            🏞️ Procházka v parku Stromovka
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium px-1">
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">❤️ 142 paculek</span>
            <span>💬 18 komentářů</span>
          </div>
        </div>
      )
    },
    map: {
      icon: '🗺️',
      title: t?.map || 'Živá mapa',
      badge: 'GPS Lokátor',
      desc: 'Sledujte na živé mapě bezpečné výběhy, psí parky a přátele, kteří jsou zrovna venku na venčení.',
      mockupHeader: 'Aktivní venčitelé ve vašem okolí',
      mockupContent: (
        <div className="space-y-3.5">
          <div className="h-40 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 relative overflow-hidden flex items-center justify-center shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:14px_14px] opacity-30" />
            <div className="relative z-10 flex flex-col items-center gap-2">
              <span className="px-4 py-2 rounded-full bg-purple-600 text-white text-xs font-extrabold shadow-lg shadow-purple-500/30 animate-bounce">
                📍 3 psí kamarádi v dosahu 500m
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Park Riegrovy sady</span>
            <span className="text-emerald-500 font-extrabold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> Rušno (8 psů)
            </span>
          </div>
        </div>
      )
    },
    chat: {
      icon: '💬',
      title: t?.chat || 'Smečka & Chat',
      badge: 'Skupiny',
      desc: 'Domlouvejte si společné srazy, zakládejte lokální smečky a komunikujte bezpečně s ostatními páníčky.',
      mockupHeader: 'Skupina: Vršovičtí hafané 🐾',
      mockupContent: (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/90 text-xs text-slate-800 dark:text-slate-200 max-w-[85%] font-medium shadow-sm">
            Ahoj všichni! Jde dneska někdo kolem 17:00 venčit na Havlíčkovy sady? 🦮
          </div>
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs max-w-[85%] ml-auto font-medium shadow-lg shadow-purple-500/20">
            My s Lunou vyrážíme! Potkáme se u altánku 👋
          </div>
          <div className="text-[11px] text-center text-slate-400 font-semibold pt-1">
            2 uživatelé píší zprávu...
          </div>
        </div>
      )
    },
    ai: {
      icon: '🤖',
      title: t?.ai || 'AI Poradce',
      badge: 'Veterinární AI',
      desc: 'Okamžité odpovědi 24/7 na otázky k výživě, výchově, zdraví i chování vašich mazlíčků.',
      mockupHeader: 'PawAI • Asistent výživy a zdraví',
      mockupContent: (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
            ❓ Kolik granulí by měl denně dostat 15kg pes?
          </div>
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium space-y-1 shadow-sm">
            <p className="font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
              <span>🐾</span> AI Odpověď:
            </p>
            <p className="text-slate-600 dark:text-slate-300">Pro 15kg dospělého psa se doporučuje cca 200–250g kvalitních krmiv denně rozdělených do 2 porcí...</p>
          </div>
        </div>
      )
    }
  }

  const faqs = [
    { q: t?.faqQ1 || 'Je aplikace PawMeet zdarma?', a: t?.faqA1 || 'Ano! Základní verze aplikace PawMeet je zcela zdarma včetně přístupu k mapě, komunitě a základnímu AI poradci.' },
    { q: t?.faqQ2 || 'Je PawMeet vhodný i pro kočky?', a: t?.faqA2 || 'Určitě! Aplikace je navržena pro všechny majitele domácích mazlíčků – psy, kočky i další členy rodiny.' },
    { q: 'Jak je zajištěno soukromí mé polohy?', a: 'Vaše přesná poloha není nikdy veřejně sdílena bez vašeho souhlasu. Na mapě se zobrazuje pouze přibližná zóna pro vaši bezpečnou navigaci.' }
  ]

  return (
    <div className="fixed inset-0 z-50 w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-y-auto selection:bg-purple-500 selection:text-white flex flex-col items-center">
      
      {/* Background Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-gradient-to-tr from-purple-600/20 via-indigo-500/20 to-pink-500/20 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] bg-purple-500/10 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute top-[75%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 blur-[150px] pointer-events-none rounded-full" />

      {/* HEADER */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-2xl bg-white/70 dark:bg-slate-950/75 border-b border-slate-200/60 dark:border-slate-800/80 transition-all">
        <div className="max-w-6xl mx-auto px-6 h-20 flex justify-between items-center w-full">
          <Link href="/" className="flex items-center gap-3 group">
            <PawLogo className="w-10 h-10 transition-transform group-hover:scale-105" />
            <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 dark:from-purple-400 dark:via-indigo-300 dark:to-pink-400 bg-clip-text text-transparent">
              PawMeet
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language Selector */}
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-800 transition-all border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md"
              >
                <span>{currentLangObj.flag}</span>
                <span className="uppercase tracking-wider">{currentLangObj.code}</span>
                <span className={`text-[9px] transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden py-2 z-50 backdrop-blur-xl">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => selectLanguage(item.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-left transition-colors ${
                        lang === item.code ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="text-base">{item.flag}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <Link 
              href="/login" 
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-xs sm:text-sm shadow-sm backdrop-blur-md"
            >
              {t?.login || 'Přihlásit se'}
            </Link>

            <Link 
              href="/register" 
              className="hidden sm:flex px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] items-center gap-2"
            >
              <span>{t?.join || 'Registrace'}</span>
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="relative w-full max-w-5xl mx-auto px-6 pt-16 sm:pt-24 pb-20 flex flex-col items-center text-center">
        
        <div className="relative mb-8 group cursor-pointer">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-purple-600 to-pink-500 blur-2xl opacity-50 group-hover:opacity-75 transition-opacity" />
          <PawLogo className="relative w-28 h-28 sm:w-36 sm:h-36 shadow-2xl" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 text-xs font-extrabold mb-8 backdrop-blur-md">
          <span>✨</span>
          <span>{t?.badgeDog || 'Komunita pro vašeho psa & kočku'}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.15] max-w-4xl mb-6">
          {t?.welcome || 'Vítejte v'}{' '}
          <span className="bg-gradient-to-r from-purple-600 via-indigo-500 to-pink-500 dark:from-purple-400 dark:via-indigo-300 dark:to-pink-400 bg-clip-text text-transparent">
            PawMeet
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mb-10 font-medium">
          {t?.subtitle || 'Místo, kde se setkávají milovníci zvířat, sdílí své příběhy, plánují venčení a využívají chytré nástroje pro péči o mazlíčky.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-8">
          <Link 
            href="/register" 
            className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-black py-4 px-8 rounded-2xl shadow-xl shadow-purple-500/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 text-center text-sm sm:text-base"
          >
            <span>🚀</span>
            <span>{t?.join || 'Připojit se zdarma'}</span>
          </Link>

          <Link 
            href="/login" 
            className="flex-1 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 font-bold py-4 px-8 rounded-2xl shadow-sm transition-all text-center flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <span>🔐</span>
            <span>{t?.hasAccount || 'Již mám účet'}</span>
          </Link>
        </div>

        <Link 
          href="/domu" 
          className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-2 py-2.5 px-6 rounded-xl hover:bg-purple-500/10 transition-colors mb-20 border border-transparent hover:border-purple-500/20"
        >
          <span>🧭</span>
          <span>{t?.browse || 'Procházet aplikaci bez přihlášení'}</span>
        </Link>

        {/* INTERACTIVE MODULE TABS */}
        <section className="w-full max-w-4xl mb-24">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-4xl font-black mb-3">Vše pro vašeho parťáka na jednom místě</h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Přepínejte mezi moduly a prohlédněte si funkčnost aplikace.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-white/60 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 backdrop-blur-xl mb-8 shadow-md">
            {(Object.keys(tabData) as TabType[]).map((key) => {
              const tab = tabData[key]
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 scale-[1.02]' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-lg">{tab.icon}</span>
                  <span>{tab.title}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center text-left bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-xl">
            <div className="md:col-span-6 space-y-5">
              <span className="inline-block px-3.5 py-1 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-300 text-xs font-extrabold border border-purple-500/20">
                {tabData[activeTab].badge}
              </span>
              <h3 className="text-2xl sm:text-3xl font-black flex items-center gap-2.5">
                <span>{tabData[activeTab].icon}</span>
                <span>{tabData[activeTab].title}</span>
              </h3>
              <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed font-medium">
                {tabData[activeTab].desc}
              </p>
              <Link 
                href="/register" 
                className="inline-flex items-center gap-2 text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-2"
              >
                <span>Vyzkoušet tuto funkci</span>
                <span>→</span>
              </Link>
            </div>

            <div className="md:col-span-6 rounded-2xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 p-5 shadow-inner">
              <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400">
                <span>{tabData[activeTab].mockupHeader}</span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              {tabData[activeTab].mockupContent}
            </div>
          </div>
        </section>

        {/* REVIEWS & RATING SECTION */}
        <section className="w-full max-w-4xl mb-20">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-6 sm:p-10 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-8 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2.5">
                  <span>⭐</span> Jak se vám líbí PawMeet?
                </h3>
                <p suppressHydrationWarning className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Ohodnoťte aplikaci v reálném čase.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 shadow-sm">
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{averageRating}</span>
                  <div className="text-left">
                    <div className="text-amber-400 text-xs font-bold">★ {averageRating} / 5.0</div>
                    <div className="text-[11px] text-slate-500 font-bold" suppressHydrationWarning>
                      {loading ? 'Načítám...' : `${totalRatingCount} ${totalRatingCount === 1 ? 'recenze' : totalRatingCount >= 2 && totalRatingCount <= 4 ? 'recenze' : 'recenzí'}`}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setModalContent('reviews')}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                >
                  💬 Zobrazit recenze ({totalRatingCount})
                </button>
              </div>
            </div>

            {!submitted ? (
              <form onSubmit={handleRatingSubmit} className="space-y-6">
                <div className="space-y-4 w-full max-w-sm mx-auto sm:mx-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Vyberte hodnocení:
                    </span>
                    <span className="text-sm font-black text-amber-500 bg-amber-500/10 px-3 py-1 rounded-lg border border-amber-500/20">
                      ★ {rating.toFixed(1)} / 5.0
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-center gap-1.5 text-3xl select-none">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const fillPercentage = Math.max(0, Math.min(100, (rating - (starIndex - 1)) * 100))
                        return (
                          <div key={starIndex} className="relative cursor-pointer">
                            <span className="text-slate-300 dark:text-slate-700">★</span>
                            <div 
                              className="absolute top-0 left-0 overflow-hidden text-amber-400 pointer-events-none transition-all duration-75"
                              style={{ width: `${fillPercentage}%` }}
                            >
                              <span>★</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={rating}
                      onChange={(e) => setRating(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-between text-[10px] font-bold text-slate-400 px-1">
                    <span>0.1 (Nejhorší)</span>
                    <span>2.5</span>
                    <span>5.0 (Nejlepší)</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Napište svoji reálnou zkušenost..."
                    className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all resize-none h-24"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={rating === 0}
                    className={`px-6 py-3 rounded-xl font-extrabold text-xs sm:text-sm transition-all ${
                      rating > 0 
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/25 cursor-pointer hover:scale-[1.02]' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Odeslat mé hodnocení ({rating.toFixed(1)} ★)
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-center sm:text-left text-xs sm:text-sm font-bold flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">🎉</span>
                  <div>
                    <p className="text-base font-extrabold">Děkujeme za vaše hodnocení ({rating.toFixed(1)} ★)!</p>
                    <p className="text-xs font-normal opacity-90 mt-0.5">Vaše hodnocení bylo úspěšně uloženo.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalContent('reviews')}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shrink-0"
                >
                  Zobrazit v seznamu
                </button>
              </div>
            )}
          </div>
        </section>

        {/* INFO CARDS */}
        <section className="w-full max-w-4xl text-left space-y-8 pt-12 border-t border-slate-200/80 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5 hover:border-purple-500/30 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">💡 {t?.aboutTitle || 'O projektu'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{t?.aboutText || 'PawMeet je komunita vytvořená pro majitele mazlíčků, kteří chtějí snadno nacházet nové přátele, bezpečné výběhy a radostné zážitky.'}</p>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5 hover:border-purple-500/30 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">🛡️ {t?.safetyTitle || 'Bezpečnost'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{t?.safetyText || 'Vaše soukromí je naší prioritou. Přesná poloha se nikdy nezobrazuje a vy sami rozhodujete, s kým se propojíte.'}</p>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5 hover:border-purple-500/30 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">📜 {t?.termsTitle || 'Podmínky použití'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {t?.termsText || 'Užíváním PawMeet souhlasíte s dodržováním pravidlech komunity a uctivým chováním.'}
              </p>
              <button 
                onClick={() => setModalContent('terms')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1 inline-block"
              >
                Zobrazit podmínky →
              </button>
            </div>

            <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md p-7 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2.5 hover:border-purple-500/30 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">🔒 {t?.privacyTitle || 'Ochrana soukromí'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {t?.privacyText || 'Vaše osobní údaje chráníme podle standardů GDPR.'}
              </p>
              <button 
                onClick={() => setModalContent('privacy')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1 inline-block"
              >
                Zásady soukromí →
              </button>
            </div>
          </div>
        </section>

        {/* FAQ SECTION */}
        <section className="w-full max-w-4xl pt-12 mt-10 border-t border-slate-200/80 dark:border-slate-800 text-left">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-10">Často kladené otázky</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-6 text-left font-bold text-sm sm:text-base flex justify-between items-center gap-4 text-slate-900 dark:text-white hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`transition-transform duration-200 text-purple-600 dark:text-purple-400 font-extrabold ${openFaq === index ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-6 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 pt-4 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-10 text-center text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} PawMeet. Všechna práva vyhrazena.</p>
          <div className="flex items-center gap-6">
            <button onClick={() => setModalContent('terms')} className="hover:underline">Podmínky</button>
            <button onClick={() => setModalContent('privacy')} className="hover:underline">Soukromí</button>
            <Link href="/contact" className="hover:underline">Kontakt</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}