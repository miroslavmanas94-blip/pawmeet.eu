'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { translations, languages } from '@/utils/translations'

export default function LandingPage() {
  const [lang, setLang] = useState<typeof languages[number]['code']>('cs')
  const [isLangOpen, setIsLangOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
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

  const selectLanguage = (code: typeof languages[number]['code']) => {
    setLang(code)
    localStorage.setItem('lang', code)
    setIsLangOpen(false)
  }

  const t = translations[lang]
  const currentLangObj = languages.find(l => l.code === lang) || languages[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 flex flex-col justify-between items-center p-6 text-gray-900 transition-colors duration-300">
      
      {/* Hlavička */}
      <header className="w-full max-w-5xl flex justify-between items-center py-4 relative z-50">
        <div className="flex items-center gap-2 font-black text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          <span>🐾</span> PawMeet
        </div>
        
        <div className="flex items-center gap-3">
          {/* Jazykový výběr (Vlajka + Kód + Šipka) */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsLangOpen(!isLangOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gray-100 text-xs font-bold hover:scale-105 transition-transform shadow-sm border border-gray-200"
            >
              <span>{currentLangObj.flag}</span>
              <span className="uppercase">{currentLangObj.code}</span>
              <span className={`text-[10px] transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {isLangOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-white border border-gray-200 shadow-xl overflow-hidden py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
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

          <Link 
            href="/login" 
            className="px-5 py-2 rounded-full border border-gray-200 hover:bg-gray-100 transition-all font-medium text-sm shadow-sm"
          >
            {t.login}
          </Link>
        </div>
      </header>

      {/* Hero sekce */}
      <main className="flex flex-col items-center text-center max-w-3xl my-auto gap-6 w-full">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-semibold shadow-sm">
          {t.badgeDog}
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
          {t.welcome} <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">PawMeet</span>
        </h1>

        <p className="text-base sm:text-lg text-gray-600 max-w-lg">
          {t.subtitle}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
          <Link 
            href="/register" 
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all text-center flex items-center justify-center gap-2"
          >
            <span>{t.join}</span> 🐾
          </Link>
          <Link 
            href="/login" 
            className="flex-1 bg-white hover:bg-gray-50 border border-gray-200 font-semibold py-3.5 px-6 rounded-2xl shadow-sm transition-all text-center flex items-center justify-center"
          >
            {t.hasAccount}
          </Link>
        </div>

        <div className="mt-1">
          <Link 
            href="/domu" 
            className="text-sm font-medium text-indigo-600 hover:underline flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-indigo-50/50 transition-colors"
          >
            {t.browse}
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-4">
          <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">📸</span>
            <span className="text-xs font-bold text-gray-700">{t.stories}</span>
          </div>
          <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">🗺️</span>
            <span className="text-xs font-bold text-gray-700">{t.map}</span>
          </div>
          <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">💬</span>
            <span className="text-xs font-bold text-gray-700">{t.chat}</span>
          </div>
          <div className="bg-white/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">🤖</span>
            <span className="text-xs font-bold text-gray-700">{t.ai}</span>
          </div>
        </div>

        {/* Informační sekce */}
        <div className="w-full mt-16 text-left space-y-6 pt-10 border-t border-gray-200">
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <h3 className="text-base font-bold flex items-center gap-2">💡 {t.aboutTitle}</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t.aboutText}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <h3 className="text-base font-bold flex items-center gap-2">🛡️ {t.safetyTitle}</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t.safetyText}</p>
          </div>
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm space-y-3">
            <h3 className="text-base font-bold flex items-center gap-2">❓ {t.faqTitle}</h3>
            <div className="space-y-2 text-xs sm:text-sm text-gray-600">
              <p><strong>Q: {t.faqQ1}</strong><br />{t.faqA1}</p>
              <p><strong>Q: {t.faqQ2}</strong><br />{t.faqA2}</p>
            </div>
          </div>
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2">
            <h3 className="text-base font-bold flex items-center gap-2">📜 {t.termsTitle}</h3>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">{t.termsText}</p>
          </div>
        </div>
      </main>

      <footer className="text-xs text-gray-500 py-4 mt-8 text-center">
        {t.footer}
      </footer>
    </div>
  )
}