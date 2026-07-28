import { loginUser, signInWithGoogle, resetPassword } from './actions'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-3xl shadow-2xl border border-white/50 dark:border-gray-800/80 relative overflow-hidden">
        
        {/* Svítící efekt v rohu */}
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

        {/* Hlavička */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-4xl animate-bounce mb-2">
            🐾
          </Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Vítejte zpět!
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Vaše smečka už na vás čeká.
          </p>
        </div>

        {/* Hlášky */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium animate-shake">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-medium">
            ✅ {decodeURIComponent(message)}
          </div>
        )}

        {/* Přihlášení přes Google */}
        <form action={signInWithGoogle} className="mb-6">
          <button
            type="submit"
            className="w-full py-3 px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-center space-x-3 hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Pokračovat přes Google</span>
          </button>
        </form>

        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-800"></div>
          </div>
          <span className="relative bg-white/80 dark:bg-gray-900/80 px-4 text-xs text-gray-400 uppercase font-bold tracking-wider">
            nebo e-mailem
          </span>
        </div>

        {/* Klasický formulář */}
        <form action={loginUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="vás@email.cz"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
              Heslo
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            Přihlásit se
          </button>
        </form>

        {/* Obnova hesla */}
        <form action={resetPassword} className="mt-4 text-center">
          <input type="hidden" name="email" value="" />
          <button
            type="submit"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            Zapomněli jste heslo?
          </button>
        </form>

        {/* Odkaz na registraci */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          Nemáte ještě účet?{' '}
          <Link
            href="/register"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
          >
            Zaregistrujte se
          </Link>
        </div>

      </div>
    </div>
  )
}