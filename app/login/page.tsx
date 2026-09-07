'use client'

 { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function EmailChangePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  // Kontrola přihlášení při načtení stránky
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Pro změnu e-mailu musíte být přihlášeni do svého účtu.')
      }
      setCheckingSession(false)
    }
    checkAuth()
  }, [])

  const handleSendChangeRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    // Ověření existující relace před voláním Supabase
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setError('Relace vypršela. Přihlaste se prosím znovu.')
      setLoading(false)
      return
    }

    // Odeslání e-mailu se 6místným kódem ze šablony "Change email address"
    const { error: updateError } = await supabase.auth.updateUser({
      email: email,
    })

    if (updateError) {
      if (updateError.message.includes('Auth session missing')) {
        setError('Neste přihlášeni. Přihlaste se prosím znovu.')
      } else {
        setError(updateError.message)
      }
    } else {
      setMessage(`Kód pro potvrzení byl úspěšně odeslán na: ${email}`)
      setEmail('')
    }
    setLoading(false)
  }

  if (checkingSession) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm font-medium text-gray-500 animate-pulse">Načítání relace...</p>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 my-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-4xl animate-bounce mb-2">
            🐾
          </Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Změna e-mailu
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Zadejte novou e-mailovou adresu pro váš účet PawMeet.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-sm font-medium">
            ✓ {message}
          </div>
        )}

        <form onSubmit={handleSendChangeRequest} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              Nový e-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="novy@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Odesílám...' : 'Změnit e-mail ✉️'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Zpět do{' '}
          <Link
            href="/nastaveni"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1"
          >
            Nastavení
          </Link>
        </div>
      </div>
    </div>
  )
}


