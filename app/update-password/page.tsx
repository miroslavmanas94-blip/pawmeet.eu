import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  // Serverová akce zadaná přímo uvnitř komponenty
  async function updatePasswordAction(formData: FormData): Promise<void> {
    'use server'
    const password = formData.get('password') as string

    if (!password || password.length < 6) {
      redirect('/update-password?error=Heslo+musí+mít+alespoň+6+znaků')
    }

    const supabase = await createClient()

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      redirect(`/update-password?error=${encodeURIComponent(updateError.message)}`)
    }

    redirect('/login?message=Heslo+bylo+úspěšně+změněno!+Můžete+se+přihlásit.')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 text-center relative overflow-hidden">
        
        {/* Dekorační efekt v pozadí */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-4xl mb-4 animate-bounce">🔐</div>
        
        <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
          Nové heslo
        </h1>
        
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 font-medium">
          Zadejte své nové heslo. Po uložení se budete moci ihned přihlásit.
        </p>

        {/* Chybová hláška */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}

        <form action={updatePasswordAction} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              Nové heslo
            </label>
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="Minimálně 6 znaků"
              className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none transition"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200"
          >
            Uložit nové heslo 🐾
          </button>
        </form>

        <div className="mt-6">
          <Link href="/login" className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
            Zpět na přihlášení
          </Link>
        </div>

      </div>
    </div>
  )
}