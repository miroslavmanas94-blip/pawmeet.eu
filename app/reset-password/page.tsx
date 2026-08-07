'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

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
      alert('Heslo bylo úspěšně změněno!')
      router.push('/login')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-neutral-100">
        <h1 className="text-2xl font-bold mb-2">Obnovení hesla</h1>
        <p className="text-sm text-neutral-500 mb-6">Zadejte kód z e-mailu a vaše nové heslo.</p>

        {error && <div className="p-3 mb-4 text-xs bg-red-50 text-red-600 rounded-xl">{error}</div>}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-100 rounded-2xl text-sm outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">6místný kód z e-mailu</label>
            <input
              type="text"
              required
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-100 rounded-2xl text-sm outline-none text-center font-mono text-lg tracking-widest"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">Nové heslo</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-100 rounded-2xl text-sm outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
          >
            {loading ? 'Ukládám...' : 'Změnit heslo'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center p-10">Načítám...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}