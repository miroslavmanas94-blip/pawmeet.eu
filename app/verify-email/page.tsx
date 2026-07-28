import { resendVerificationAction } from './actions'
import Link from 'next/link'

export default async function VerifyEmailPage(props: {
  searchParams: Promise<{ email?: string; error?: string; message?: string }>
}) {
  const searchParams = await props.searchParams
  const email = searchParams?.email
  const error = searchParams?.error
  const message = searchParams?.message

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 text-center relative overflow-hidden">
        
        <div className="text-4xl mb-4">✉️</div>

        <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
          Zkontrolujte svou schránku
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Na adresu <strong className="text-indigo-600 dark:text-indigo-400">{email || 'váš e-mail'}</strong> jsme poslali ověřovací odkaz. Pro dokončení registrace na něj klikněte.
        </p>

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

        {email && (
          <form action={resendVerificationAction} className="space-y-4">
            <input type="hidden" name="email" value={email} />

            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm rounded-2xl shadow-lg transition-all"
            >
              Znovu odeslat e-mail 📩
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-gray-500 dark:text-gray-400 font-bold hover:underline">
            ⬅ Zpět na přihlášení
          </Link>
        </div>

      </div>
    </div>
  )
}