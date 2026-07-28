import { loginUser, resetPassword } from './actions'
import Link from 'next/link'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>
}) {
  const { error, message } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 relative overflow-hidden">
        
        {/* Svítící efekt */}
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
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}
        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-medium">
            ✅ {decodeURIComponent(message)}
          </div>
        )}

        {/* Přihlašovací formulář */}
        <form action={loginUser} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              E-mail
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="vás@email.cz"
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              Heslo
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2"
          >
            Přihlásit se 🐾
          </button>
        </form>

        {/* Obnova hesla */}
        <form action={resetPassword} className="mt-4 text-center">
          <input type="hidden" name="email" value="" />
          <button
            type="submit"
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
          >
            Zapomněli jste heslo?
          </button>
        </form>

        {/* Odkaz na registraci */}
        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Nemáte ještě účet?{' '}
          <Link
            href="/register"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1"
          >
            Zaregistrujte se
          </Link>
        </div>

      </div>
    </div>
  )
}