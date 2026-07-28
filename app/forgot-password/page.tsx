import { requestResetAction } from "./actions";
import Link from 'next/link'

export default async function ForgotPasswordPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 relative overflow-hidden">
        
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔑</div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Obnova hesla
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Zadejte váš e-mail a zašleme vám ověřovací kód pro změnu hesla.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}

        <form action={requestResetAction} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              E-mailová adresa
            </label>
            <input
              type="email"
              name="email"
              required
              placeholder="vas@email.cz"
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-base rounded-2xl shadow-lg transition-all"
          >
            Odeslat kód na e-mail ➔
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-gray-500 dark:text-gray-400 font-bold hover:underline">
            ⬅ Zpět na přihlášení
          </Link>
        </div>

      </div>
    </div>
  )
}