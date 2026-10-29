'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const searchParams = useSearchParams()

  const requestedDestination = searchParams.get('redirectTo') || searchParams.get('next') || '/domu'
  const redirectTo = requestedDestination.startsWith('/') && !requestedDestination.startsWith('//') ? requestedDestination : '/domu'

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })

    let authenticatedUser = loginData.user
    if (loginError) {
      // Older PawMeet accounts used email aliases internally. Keep those accounts usable
      // while all new registrations use the real e-mail address.
      try {
        const legacyResponse = await fetch('/api/auth/legacy-signin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
        })
        const legacyData = await legacyResponse.json().catch(() => ({}))
        if (legacyResponse.ok && legacyData.access_token && legacyData.refresh_token) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: legacyData.access_token,
            refresh_token: legacyData.refresh_token,
          })
          if (sessionError) {
            setError('Přihlášení se nepodařilo dokončit. Zkus to prosím znovu.')
            setLoading(false)
            return
          }
          authenticatedUser = sessionData.user
        } else {
          setError(legacyResponse.status === 429 || legacyResponse.status === 503
            ? (legacyData.error || loginError.message)
            : 'E-mail nebo heslo nejsou správné.')
          setLoading(false)
          return
        }
      } catch {
        setError(loginError.message)
        setLoading(false)
        return
      }
    }

    if (authenticatedUser) {
      const pendingPet = authenticatedUser.user_metadata?.pending_pet_profile
      if (pendingPet && typeof pendingPet === 'object') {
        try {
          const { data: existingPets } = await supabase.from('pets').select('id').eq('user_id', authenticatedUser.id).limit(1)
          if (!existingPets?.length) {
            const { error: petError } = await supabase.from('pets').insert({ ...pendingPet, user_id: authenticatedUser.id })
            if (!petError) await supabase.auth.updateUser({ data: { pending_pet_profile: null } })
          } else {
            await supabase.auth.updateUser({ data: { pending_pet_profile: null } })
          }
        } catch {
          // Keep the pending metadata so the next successful sign-in can retry safely.
        }
      }
      router.push(redirectTo)
      router.refresh()
    } else {
      setError('Přihlášení se nepodařilo dokončit. Zkus to prosím znovu.')
      setLoading(false)
    }
  }

  return (
    <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 my-auto">
      <div className="text-center mb-8">
        <Link href="/" className="mx-auto mb-4 inline-flex items-center justify-center"><img src="/logo.png" alt="PawMeet" className="h-14 w-14 rounded-2xl object-cover" /></Link>
        <h1 className="text-3xl font-black bg-gradient-to-r from-[#5B5BF7] to-[#9333EA] bg-clip-text text-transparent">
          Přihlášení
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
          Vítejte zpět! Přihlaste se ke svému účtu.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
            E-mailová adresa <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            required
            placeholder="vas@email.cz"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1 ml-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">
              Heslo <span className="text-red-500">*</span>
            </label>
            <Link
              href="/forgot-password"
              className="text-xs text-[#5B5BF7] dark:text-[#A5B4FC] font-bold hover:underline"
            >
              Zapomenuté heslo?
            </Link>
          </div>
          <input
            type="password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-[#5B5BF7] to-[#9333EA] hover:from-[#4F46E5] hover:to-[#7E22CE] text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-[#5B5BF7]/25 hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2 disabled:opacity-50 cursor-pointer"
        >
          {loading ? 'Přihlašuji...' : 'Přihlásit se'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
        Nemáte ještě účet?{' '}
        <Link
          href="/register"
          className="text-[#5B5BF7] dark:text-[#A5B4FC] font-bold hover:underline ml-1"
        >
          Zaregistrovat se
        </Link>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-gradient-to-br from-amber-50 via-indigo-50 to-violet-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-violet-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 sm:p-6">
      <Suspense fallback={<div className="text-center font-bold">Načítání...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  )
}