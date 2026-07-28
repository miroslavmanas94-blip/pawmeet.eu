import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; error?: string }>
}) {
  const { email, error } = await searchParams

  async function verifyOtpAction(formData: FormData) {
    'use server'
    const code = formData.get('code') as string
    const userEmail = formData.get('email') as string

    const supabase = await createClient()

    // Ověření kódu vůči Supabase Auth
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: userEmail,
      token: code,
      type: 'signup',
    })

    if (verifyError) {
      redirect(`/verify-email?email=${encodeURIComponent(userEmail)}&error=Neplatný+nebo+expirovaný+kód`)
    }

    // Po úspěšném ověření přesměrujeme do domovské aplikace
    redirect('/domu')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 text-center relative overflow-hidden">
        
        <div className="text-4xl mb-4 animate-bounce">📩</div>

        <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
          Ověření e-mailu
        </h1>

        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Zadejte ověřovací kód, který jsme poslali na <br />
          <strong className="text-indigo-600 dark:text-indigo-400">{email || 'váš e-mail'}</strong>.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}

        <form action={verifyOtpAction} className="space-y-4">
          <input type="hidden" name="email" value={email || ''} />

          <div>
            <input
              type="text"
              name="code"
              required
              maxLength={6}
              placeholder="123456"
              className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            Potvrdit a vstoupit 🐾
          </button>
        </form>

      </div>
    </div>
  )
}