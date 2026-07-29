import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-between p-4 pb-28 bg-gradient-to-br from-amber-50/50 via-indigo-50/50 to-purple-100/50 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 transition-colors">
      
      {/* Horní hlavička */}
      <header className="w-full max-w-4xl flex justify-between items-center py-4">
        <div className="flex items-center gap-2 font-black text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          🐾 PawMeet
        </div>
        <div>
          {user ? (
            <form action={signOut}>
              <button type="submit" className="text-xs px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 font-bold rounded-xl transition-all">
                Odhlásit se
              </button>
            </form>
          ) : (
            <Link href="/login" className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all">
              Přihlásit se
            </Link>
          )}
        </div>
      </header>

      {/* Hlavní obsah */}
      <main className="flex flex-col items-center text-center max-w-2xl my-auto py-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-800 text-xs font-bold text-indigo-600 dark:text-indigo-400 shadow-sm mb-6">
          🐶 První světová síť pro psy a kočky 🐱
        </div>
        
        <h1 className="text-4xl sm:text-6xl font-black mb-4 tracking-tight">
          Vítejte v <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">PawMeet</span>
        </h1>
        
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-8 max-w-lg leading-relaxed font-medium">
          Místo, kde váš čtyřnohý parťák najde nové kámoše, vy přátele na venčení a AI asistent vám vždy poradí.
        </p>
        
        {!user && (
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mb-12">
            <Link href="/register" className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-black rounded-2xl shadow-xl transition-all transform hover:-translate-y-0.5">
              Přidat se k nám 🐾
            </Link>
            <Link href="/login" className="px-8 py-4 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200 font-black rounded-2xl shadow-lg border border-gray-200/80 dark:border-gray-800 transition-all transform hover:-translate-y-0.5">
              Mám již účet
            </Link>
          </div>
        )}

        {/* Interaktivní karty s Hover efekty */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
          <Link href="/stories" className="group p-5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 dark:border-gray-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500/50 text-center">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">📸</div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Stories & Fotky</h3>
          </Link>

          <Link href="/map" className="group p-5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 dark:border-gray-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500/50 text-center">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🗺️</div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Živá mapa</h3>
          </Link>

          <Link href="/chat" className="group p-5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 dark:border-gray-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500/50 text-center">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">💬</div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">Smečka & Chat</h3>
          </Link>

          <Link href="/ai-advisor" className="group p-5 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 dark:border-gray-800 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:border-indigo-500/50 text-center">
            <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">🤖</div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200">AI Poradce</h3>
          </Link>
        </div>
      </main>

      {/* Patička */}
      <footer className="text-xs text-gray-500 dark:text-gray-500 text-center py-4">
        PawMeet © 2026 – Sociální síť pro milovníky psů a koček
      </footer>

      {/* Plovoucí spodní lišta */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-md bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/50 dark:border-gray-800 shadow-2xl rounded-2xl px-4 py-3 flex justify-around items-center z-50">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-indigo-600 dark:text-indigo-400 hover:scale-105 transition-transform">
          <span className="text-lg">🏠</span>
          <span className="text-[10px] font-bold">Domů</span>
        </Link>
        <Link href="/map" className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-transform">
          <span className="text-lg">🗺️</span>
          <span className="text-[10px] font-bold">Mapa</span>
        </Link>
        <Link href="/chat" className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-transform">
          <span className="text-lg">🐾</span>
          <span className="text-[10px] font-bold">Smečka</span>
        </Link>
        <Link href="/ai-advisor" className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-transform">
          <span className="text-lg">🤖</span>
          <span className="text-[10px] font-bold">AI Chat</span>
        </Link>
        <Link href="/profile" className="flex flex-col items-center gap-0.5 text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-105 transition-transform">
          <span className="text-lg">👤</span>
          <span className="text-[10px] font-bold">Profil</span>
        </Link>
      </nav>

    </div>
  )
}