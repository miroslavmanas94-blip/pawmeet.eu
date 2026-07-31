import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex flex-col justify-between items-center p-6 text-gray-900 dark:text-gray-100">
      
      {/* Horní hlavička */}
      <header className="w-full max-w-5xl flex justify-between items-center py-4">
        <div className="flex items-center gap-2 font-black text-xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          <span>🐾</span> PawMeet
        </div>
        <Link 
          href="/login" 
          className="px-5 py-2 rounded-full border border-gray-200 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all font-medium text-sm shadow-sm"
        >
          Přihlásit se
        </Link>
      </header>

      {/* Hlavní obsah hero sekce */}
      <main className="flex flex-col items-center text-center max-w-2xl my-auto gap-6">
        
        {/* Malý badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold shadow-sm">
          <span>🐶</span> První světová síť pro psy i kočky <span>🐱</span>
        </div>

        {/* Hlavní nadpis */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight">
          Vítejte v <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">PawMeet</span>
        </h1>

        {/* Podnadpis */}
        <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 max-w-lg">
          Místo, kde váš čtyřnohý parťák najde nové kámoše, vy přátele na venčení a AI asistent vám vždy poradí.
        </p>

        {/* Akční tlačítka */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-2">
          <Link 
            href="/register" 
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-semibold py-3.5 px-6 rounded-2xl shadow-lg shadow-indigo-500/25 transition-all text-center flex items-center justify-center gap-2"
          >
            <span>Přidat se k nám</span> 🐾
          </Link>
          <Link 
            href="/login" 
            className="flex-1 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 font-semibold py-3.5 px-6 rounded-2xl shadow-sm transition-all text-center"
          >
            Mám již účet
          </Link>
        </div>

        {/* NOVÉ: Možnost pokračovat bez přihlášení (pouze videa) */}
        <div className="mt-1">
          <Link 
            href="/feed/guest" 
            className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5 py-1 px-3 rounded-lg hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-colors"
          >
            ▶️ Pokračovat bez přihlášení (prohlížet videa)
          </Link>
        </div>

        {/* Náhledové ikony funkcí */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full mt-8">
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">📸</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Stories & Fotky</span>
          </div>
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">🗺️</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Živá mapa</span>
          </div>
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">💬</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Smečka & Chat</span>
          </div>
          <div className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-md p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col items-center gap-1 shadow-sm">
            <span className="text-2xl">🤖</span>
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">AI Poradce</span>
          </div>
        </div>

      </main>

      {/* Patička */}
      <footer className="text-xs text-gray-500 dark:text-gray-500 py-4">
        PawMeet © 2026 – Sociální síť pro milovníky psů a koček
      </footer>

    </div>
  )
}