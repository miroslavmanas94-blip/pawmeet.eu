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
      className={`rounded-[22%] shadow-md object-cover shrink-0 ${className}`}
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

  // Příznak pro bezpečné renderování na klientovi
  const [mounted, setMounted] = useState(false)

  // Hodnocení a Reálné Recenze
  const [rating, setRating] = useState<number>(3.7)
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
    : '0.0'

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
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 p-0.5 shadow-md">
              <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold">🐶</div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">Buddy & Max</p>
              <p className="text-[10px] text-slate-500">Zlatý retrívr • 2 roky</p>
            </div>
          </div>
          <div className="h-36 rounded-2xl bg-gradient-to-tr from-purple-500/10 via-indigo-500/10 to-pink-500/10 border border-purple-200/50 dark:border-purple-800/40 flex items-center justify-center text-purple-900 dark:text-purple-200 text-xs font-bold shadow-inner">
            🏞️ Procházka v parku Stromovka
          </div>
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
            <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-bold">❤️ 142 paculek</span>
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
        <div className="space-y-3">
          <div className="h-36 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 relative overflow-hidden flex items-center justify-center shadow-inner">
            <div className="absolute inset-0 bg-[radial-gradient(#8b5cf6_1px,transparent_1px)] [background-size:12px_12px] opacity-30" />
            <div className="relative z-10 flex flex-col items-center gap-1">
              <span className="px-3.5 py-1.5 rounded-full bg-purple-600 text-white text-[11px] font-extrabold shadow-lg shadow-purple-500/30 animate-bounce">
                📍 3 psí kamarádi v dosahu 500m
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/60 dark:border-purple-900/50 text-xs font-semibold">
            <span className="text-slate-700 dark:text-slate-300">Park Riegrovy sady</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">🟢 Rušno (8 psů)</span>
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
        <div className="space-y-2.5">
          <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 max-w-[85%] font-medium shadow-sm">
            Ahoj všichni! Jde dneska někdo kolem 17:00 venčit na Havlíčkovy sady? 🦮
          </div>
          <div className="p-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs max-w-[85%] ml-auto font-medium shadow-md shadow-purple-500/20">
            My s Lunou vyrážíme! Potkáme se u altánku 👋
          </div>
          <div className="text-[10px] text-center text-slate-400 font-semibold pt-1">
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
        <div className="space-y-2.5">
          <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 font-medium">
            ❓ Kolik granulí by měl denně dostat 15kg pes?
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/60 dark:to-indigo-950/60 border border-purple-200/60 dark:border-purple-800/50 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-medium space-y-1 shadow-sm">
            <p className="font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1">
              <span>🐾</span> AI Odpověď:
            </p>
            <p>Pro 15kg dospělého psa se doporučuje cca 200–250g kvalitních krmiv denně rozdělených do 2 porcí...</p>
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
    <div className="relative min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 overflow-x-hidden selection:bg-purple-500 selection:text-white">

      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-tr from-purple-500/20 via-indigo-500/15 to-pink-500/20 dark:from-purple-900/40 dark:via-indigo-950/50 blur-[140px] pointer-events-none rounded-full" />

      <header className="sticky top-0 z-50 w-full backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-purple-100/60 dark:border-slate-800/80 transition-all">
        <div className="max-w-6xl mx-auto px-5 h-16 sm:h-20 flex justify-between items-center">

          <Link href="/" className="flex items-center gap-3 group">
            <PawLogo className="w-9 h-9 sm:w-10 sm:h-10 group-hover:scale-105" />
            <span className="font-black text-xl tracking-tight bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-500 dark:from-purple-400 dark:to-indigo-300 bg-clip-text text-transparent">
              PawMeet
            </span>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative" ref={dropdownRef}>
              <button 
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/80 dark:bg-slate-800/80 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-200/80 dark:border-slate-700/80 shadow-sm backdrop-blur-md"
              >
                <span>{currentLangObj.flag}</span>
                <span className="uppercase">{currentLangObj.code}</span>
                <span className={`text-[8px] transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {isLangOpen && (
                <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {languages.map((item) => (
                    <button
                      key={item.code}
                      onClick={() => selectLanguage(item.code)}
                      className={`w-full flex items-center gap-3 px-4 py-2 text-xs font-medium text-left hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-colors ${
                        lang === item.code ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-700 dark:text-slate-300'
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
              className="px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-xs sm:text-sm shadow-sm flex items-center gap-1.5 backdrop-blur-md"
            >
              <span>🔐</span>
              <span>{t?.login || 'Přihlásit se'}</span>
            </Link>

            <Link 
              href="/register" 
              className="hidden sm:flex px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:opacity-95 text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/25 transition-all hover:scale-[1.02] items-center gap-1.5"
            >
              <span>🚀</span>
              <span>{t?.join || 'Registrace'}</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative max-w-5xl mx-auto px-5 pt-12 sm:pt-16 pb-20 flex flex-col items-center text-center">

        <div className="relative mb-8 transform hover:scale-105 transition-transform duration-300">
          <PawLogo className="w-28 h-28 sm:w-36 sm:h-36 shadow-2xl shadow-purple-500/30" />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/90 dark:bg-purple-950/70 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-extrabold mb-6 shadow-sm backdrop-blur-md">
          <span>✨</span>
          <span>{t?.badgeDog || 'Komunita pro vašeho psa & kočku'}</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.12] max-w-3xl mb-6">
          {t?.welcome || 'Vítejte v'}{' '}
          <span className="bg-gradient-to-r from-purple-700 via-indigo-600 to-purple-500 dark:from-purple-400 dark:to-indigo-300 bg-clip-text text-transparent">
            PawMeet
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed mb-10 font-medium">
          {t?.subtitle || 'Místo, kde se setkávají milovníci zvířat, sdílí své příběhy, plánují venčení a využívají chytré nástroje pro péči o mazlíčky.'}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md mb-6">
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
          className="text-xs sm:text-sm font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-2 py-2 px-5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors mb-16 border border-transparent hover:border-purple-200/50"
        >
          <span>🧭</span>
          <span>{t?.browse || 'Procházet aplikaci bez přihlášení'}</span>
        </Link>

        {/* ZÁLOŽKY */}
        <section className="w-full max-w-4xl mb-20">
          <div className="text-center mb-8">
            <h2 className="text-2xl sm:text-3xl font-black mb-2">Vše pro vašeho parťáka na jednom místě</h2>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">Přepínejte mezi moduly a prohlédněte si funkcionalitu.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 p-2 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-purple-100 dark:border-slate-800 backdrop-blur-xl mb-8 shadow-sm">
            {(Object.keys(tabData) as TabType[]).map((key) => {
              const tab = tabData[key]
              const isActive = activeTab === key
              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive 
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/20 scale-[1.02]' 
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="text-base">{tab.icon}</span>
                  <span>{tab.title}</span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center text-left bg-white/80 dark:bg-slate-900/80 border border-purple-100 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl backdrop-blur-xl">
            <div className="md:col-span-6 space-y-4">
              <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 text-xs font-extrabold border border-purple-200 dark:border-purple-800">
                {tabData[activeTab].badge}
              </span>
              <h3 className="text-2xl font-black flex items-center gap-2">
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

            <div className="md:col-span-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 p-4 shadow-inner">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400">
                <span>{tabData[activeTab].mockupHeader}</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              {tabData[activeTab].mockupContent}
            </div>
          </div>
        </section>

        {/* HODNOCENÍ - PRECIZNÍ DÍLČÍ VYPLŇOVÁNÍ HVĚZD (0.1 až 5.0) */}
        <section className="w-full max-w-4xl mb-16">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-purple-200/80 dark:border-purple-900/50 shadow-xl space-y-6 text-center sm:text-left">

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center justify-center sm:justify-start gap-2">
                  <span>⭐</span> Jak se vám líbí PawMeet?
                </h3>
                <p 
                  suppressHydrationWarning
                  className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium"
                >
                  Ohodnoťte aplikaci v reálném čase.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 shadow-sm">
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400">{averageRating}</span>
                  <div className="text-left">
                    <div className="text-amber-400 text-xs font-bold">★ {averageRating} / 5.0</div>
                    <div className="text-[10px] text-slate-500 font-bold" suppressHydrationWarning>
                      {loading ? 'Načítám...' : `${totalRatingCount} ${totalRatingCount === 1 ? 'recenze' : totalRatingCount >= 2 && totalRatingCount <= 4 ? 'recenze' : 'recenzí'}`}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setModalContent('reviews')}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all border border-slate-200/80 dark:border-slate-700"
                >
                  💬 Zobrazit recenze ({totalRatingCount})
                </button>
              </div>
            </div>

            {!submitted ? (
              <form onSubmit={handleRatingSubmit} className="space-y-4">
                
                <div className="space-y-3 w-full max-w-xs mx-auto sm:mx-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Vyberte hodnocení:
                    </span>
                    <span className="text-sm font-black text-amber-500 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                      ★ {rating.toFixed(1)} / 5.0
                    </span>
                  </div>

                  {/* 5 Hvězd s dynamickým ořezem pro každou zvlášť */}
                  <div className="space-y-2">
                    <div className="flex justify-center gap-1 text-3xl select-none">
                      {[1, 2, 3, 4, 5].map((starIndex) => {
                        const fillPercentage = Math.max(0, Math.min(100, (rating - (starIndex - 1)) * 100))

                        return (
                          <div key={starIndex} className="relative">
                            {/* Šedá podkladová hvězda */}
                            <span className="text-slate-300 dark:text-slate-700">★</span>
                            
                            {/* Zlatá vrchní hvězda oříznutá podle přesné hodnoty */}
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

                    {/* Slider pro výběr 0.1 - 5.0 */}
                    <input
                      type="range"
                      min="0.1"
                      max="5.0"
                      step="0.1"
                      value={rating}
                      onChange={(e) => setRating(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-400 focus:outline-none"
                    />
                  </div>

                  {/* Škála min / max */}
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
                    className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none h-20"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={rating === 0}
                    className={`px-6 py-2.5 rounded-xl font-extrabold text-xs transition-all ${
                      rating > 0 
                        ? 'bg-purple-600 hover:bg-purple-700 text-white shadow-md cursor-pointer hover:scale-105' 
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    Odeslat mé hodnocení ({rating.toFixed(1)} ★)
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-center sm:text-left text-xs sm:text-sm font-bold flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎉</span>
                  <div>
                    <p>Děkujeme za vaše hodnocení ({rating.toFixed(1)} ★)!</p>
                    <p className="text-[11px] font-normal opacity-90">Vaše hodnocení bylo úspěšně uloženo do databáze.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setModalContent('reviews')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
                >
                  Zobrazit v seznamu
                </button>
              </div>
            )}

          </div>
        </section>

        {/* INFORMAČNÍ SEKCE */}
        <section className="w-full max-w-4xl text-left space-y-8 pt-10 border-t border-slate-200/80 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-purple-100/80 dark:border-slate-800 shadow-sm space-y-2 hover:border-purple-200 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">💡 {t?.aboutTitle || 'O projektu'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{t?.aboutText || 'PawMeet je komunita vytvořená pro majitele mazlíčků, kteří chtějí snadno nacházet nové přátele, bezpečné výběhy a radostné zážitky.'}</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-purple-100/80 dark:border-slate-800 shadow-sm space-y-2 hover:border-purple-200 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">🛡️ {t?.safetyTitle || 'Bezpečnost'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">{t?.safetyText || 'Vaše soukromí je naší prioritou. Přesná poloha se nikdy nezobrazuje a vy sami rozhodujete, s kým se propojíte.'}</p>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-purple-100/80 dark:border-slate-800 shadow-sm space-y-2 hover:border-purple-200 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">📜 {t?.termsTitle || 'Podmínky použití'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {t?.termsText || 'Užíváním PawMeet souhlasíte s dodržováním pravidel komunity a uctivým chováním.'}
              </p>
              <button 
                onClick={() => setModalContent('terms')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1 inline-block"
              >
                Zobrazit podmínky
              </button>
            </div>

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-purple-100/80 dark:border-slate-800 shadow-sm space-y-2 hover:border-purple-200 transition-colors">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">🔒 {t?.privacyTitle || 'Ochrana soukromí'}</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                {t?.privacyText || 'Vaše osobní údaje chráníme podle standardů GDPR.'}
              </p>
              <button 
                onClick={() => setModalContent('privacy')}
                className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline pt-1 inline-block"
              >
                Zásady soukromí
              </button>
            </div>
          </div>
        </section>

        {/* FAQ SEKCE */}
        <section className="w-full max-w-4xl pt-10 mt-8 border-t border-slate-200/80 dark:border-slate-800 text-left">
          <h2 className="text-2xl sm:text-3xl font-black text-center mb-8">Často kladené otázky</h2>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div 
                key={index}
                className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-purple-100/80 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="w-full p-5 text-left font-bold text-sm sm:text-base flex justify-between items-center gap-4 text-slate-900 dark:text-white hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <span className={`transition-transform duration-200 text-purple-600 dark:text-purple-400 font-extrabold ${openFaq === index ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                {openFaq === index && (
                  <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 pt-3 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* MODÁLNÍ OKNO PRO RECENZE / PODMÍNKY */}
      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-xl w-full max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-black text-base sm:text-lg flex items-center gap-2">
                {modalContent === 'reviews' && '💬 Recenze uživatelů'}
                {modalContent === 'terms' && '📜 Podmínky použití'}
                {modalContent === 'privacy' && '🔒 Ochrana soukromí'}
              </h3>
              <button 
                onClick={() => setModalContent(null)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {modalContent === 'reviews' && (
                <div className="space-y-3">
                  {reviewsList.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 font-medium">Zatím nebyly přidány žádné recenze.</p>
                  ) : (
                    reviewsList.map((rev) => (
                      <div key={rev.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 dark:text-white">{rev.author}</span>
                          <span className="text-amber-500 font-black">★ {Number(rev.rating).toFixed(1)}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">{rev.text}</p>
                        <span className="text-[10px] text-slate-400 block pt-1">
                          {new Date(rev.created_at).toLocaleDateString('cs-CZ')}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {modalContent === 'terms' && (
                <div className="space-y-3">
                  <p>Vítejte v aplikaci PawMeet. Používáním této služby souhlasíte s následujícími pravidly komunity:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Respektujte ostatní chovatele a jejich zvířata.</li>
                    <li>Nezveřejňujte nevhodný nebo nepravdivý obsah.</li>
                    <li>Dodržujte místní vyhlášky a pravidla pro venčení psů.</li>
                  </ul>
                </div>
              )}

              {modalContent === 'privacy' && (
                <div className="space-y-3">
                  <p>Vaše soukromí je pro nás klíčové. Shromažďujeme pouze údaje nezbytné pro správné fungování aplikace PawMeet:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Poloha se využívá výhradně s vaším souhlasem k vyhledání nejbližších parků a přátel.</li>
                    <li>Údaje nepředáváme třetím stranám bez zákonného důvodu.</li>
                    <li>Svoje údaje můžete kdykoli upravit nebo požádat o smazání svého účtu.</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex justify-end">
              <button
                onClick={() => setModalContent(null)}
                className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors"
              >
                Zavřít
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}