'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    const supabase = createClient()
    
    // Ukládáme POUZE .message (string), nikdy celý objekt error
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email)

    if (resetError) {
      setError(resetError.message)
    } else {
      setMessage('Kód pro obnovení hesla byl odeslán na váš e-mail.')
      setTimeout(() => {
        router.push(`/reset-password?email=${encodeURIComponent(email)}`)
      }, 1500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl border border-neutral-100">
        <h1 className="text-2xl font-bold mb-2">Zapomenuté heslo</h1>
        <p className="text-sm text-neutral-500 mb-6">Zadejte svůj e-mail a my vám pošleme kód pro obnovení.</p>

        {error && (
          <div className="p-3 mb-4 text-xs bg-red-50 text-red-600 rounded-xl">
            {error}
          </div>
        )}

        {message && (
          <div className="p-3 mb-4 text-xs bg-green-50 text-green-600 rounded-xl">
            {message}
          </div>
        )}

        <form onSubmit={handleSendCode} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-neutral-500 block mb-1">E-mailová adresa</label>
            <input
              type="email"
              required
              placeholder="vas@email.cz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-neutral-100 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl transition-all disabled:opacity-50"
          >
            {loading ? 'Odesílám...' : 'Odeslat kód'}
          </button>
        </form>
      </div>
    </div>
  )
}