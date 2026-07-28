import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex flex-col justify-between relative overflow-hidden select-none">
      
      {/* Dekorační plovoucí prvky v pozadí */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-purple-300/30 dark:bg-purple-600/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-amber-300/30 dark:bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Horní lišta / Logo */}
      <header className="p-6 flex justify-between items-center max-w-5xl mx-auto w-full z-10">
        <div className="flex items-center space-x-2">
          <span className="text-3xl animate-bounce">🐾</span>
          <span className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            PawMeet
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2 text-sm font-semibold rounded-full border border-indigo-200 dark:border-indigo-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm"
        >
          Přihlásit se
        </Link>
      </header>

      {/* Hlavní uvítací obsah */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto z-10 py-12">
        
        {/* Hravý badge */}
        <div className="inline-flex items-center space-x-2 bg-indigo-100/80 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium mb-6 backdrop-blur-sm animate-fade-in shadow-inner">
          <span>🐶</span>
          <span>První světová síť pro psy i kočky</span>
          <span>🐱</span>
        </div>

        {/* Hlavní nadpis */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-4">
          Vítejte v{" "}
          <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            PawMeet
          </span>
        </h1>

        {/* Podnadpis */}
        <p className="text-base sm:text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-8 font-medium">
          Místo, kde váš čtyřnohý parťák najde nové kámoše, vy přátele na venčení a AI asistent vám vždy poradí.
        </p>

        {/* Tlačítka pro akci */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <Link
            href="/register"
            className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-lg rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 text-center flex items-center justify-center space-x-2 group"
          >
            <span>Přidat se k nám</span>
            <span className="group-hover:translate-x-1 transition-transform">🐾</span>
          </Link>

          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md hover:bg-white dark:hover:bg-gray-900 text-gray-800 dark:text-gray-200 font-bold text-lg rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 shadow-md hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all duration-200 text-center"
          >
            Mám již účet
          </Link>
        </div>

        {/* Ukázka klíčových funkcí */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-12 w-full">
          <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 dark:border-gray-800 hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">📸</div>
            <div className="text-xs font-bold">Stories & Fotky</div>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 dark:border-gray-800 hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">🗺️</div>
            <div className="text-xs font-bold">Živá mapa</div>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 dark:border-gray-800 hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">💬</div>
            <div className="text-xs font-bold">Smečka & Chat</div>
          </div>
          <div className="bg-white/50 dark:bg-gray-900/40 backdrop-blur-md p-4 rounded-2xl border border-white/60 dark:border-gray-800 hover:scale-105 transition-transform duration-200">
            <div className="text-2xl mb-1">🤖</div>
            <div className="text-xs font-bold">AI Poradce</div>
          </div>
        </div>

      </main>

      {/* Patička */}
      <footer className="p-4 text-center text-xs text-gray-500 dark:text-gray-400 z-10">
        PawMeet &copy; {new Date().getFullYear()} – Sociální síť pro milovníky psů a koček
      </footer>

    </div>
  );
}