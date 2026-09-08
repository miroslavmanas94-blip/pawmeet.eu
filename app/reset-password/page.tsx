'use client'

export const dynamic = 'force-dynamic'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

function ResetPasswordContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  const [email, setEmail] = useState(searchParams.get('email') || '')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // 1. Ověření OTP kódu z e-mailu
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'recovery'
    })

    if (verifyError) {
      setError('Neplatný nebo vypršený kód.')
      setLoading(false)
      return
    }

    // 2. Nastavení nového hesla
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setError(updateError.message)
    } else {
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 my-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-4xl animate-bounce mb-2">
            🐾
          </Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Obnovení hesla
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Zadejte kód z e-mailu a vaše nové heslo.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              E-mail <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              8místný kód z e-mailu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="12345678"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-center font-mono text-lg tracking-widest font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
              Nové heslo <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-2 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Ukládám...' : 'Změnit heslo 🔑'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Zpět na{' '}
          <Link
            href="/login"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1"
          >
            Přihlášení
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-medium text-gray-500">Načítám...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}