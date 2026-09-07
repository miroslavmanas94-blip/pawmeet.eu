'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [errorMsg, setErrorMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [emailStatus, setEmailStatus] = useState<'idle' | 'checking' | 'exists' | 'valid'>('idle')
  const [allowMultiAccount, setAllowMultiAccount] = useState(false)
  const router = useRouter()

  // Automatická kontrola existence e-mailu
  const checkEmailExists = async (email: string) => {
    const cleanEmail = email.trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setEmailStatus('idle')
      return
    }

    setEmailStatus('checking')
    const supabase = createClient()
    
    // Dotaz do tabulky profiles na existující e-mail
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (data) {
      setEmailStatus('exists')
    } else {
      setEmailStatus('valid')
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    const supabase = createClient()
    const formData = new FormData(e.currentTarget)
    
    const rawEmail = (formData.get('email') as string).trim()
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    
    if (password !== confirmPassword) {
      setErrorMsg('Hesla se neshodují.')
      setLoading(false)
      return
    }

    // Pokud e-mail existuje a je povolen vícenásobný účet, vytvoří se unikátní alias pro Supabase (např. email+1710000000@domain.cz)
    const finalEmail = (emailStatus === 'exists' && allowMultiAccount)
      ? rawEmail.replace('@', `+${Date.now()}@`)
      : rawEmail

    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string
    const username = formData.get('username') as string
    const birthDate = formData.get('birthDate') as string
    const city = formData.get('city') as string
    const bio = formData.get('bio') as string

    const petName = formData.get('petName') as string
    const petType = formData.get('petType') as string
    const petBreed = formData.get('petBreed') as string
    const petBirthDate = formData.get('petBirthDate') as string
    const petGender = formData.get('petGender') as string
    const petSize = formData.get('petSize') as string
    const petNature = formData.get('petNature') as string
    const petActivities = formData.get('petActivities') as string

    // 1. Registrace uživatele v Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email: finalEmail,
      password,
      options: {
        data: {
          original_email: rawEmail,
          username,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          city,
          bio,
        },
      },
    })

    if (error) {
      setErrorMsg(error.message)
      setLoading(false)
      return
    }

    // 2. Uložení údajů o mazlíčkovi do tabulky 'pets'
    if (data.user) {
      const { error: petError } = await supabase.from('pets').insert({
        user_id: data.user.id,
        name: petName,
        type: petType,
        breed: petBreed,
        birth_date: petBirthDate,
        gender: petGender,
        size: petSize,
        nature: petNature,
        activities: petActivities,
      })

      if (petError) {
        console.error('Chyba při ukládání mazlíčka:', petError.message)
      }
    }

    // 3. Okamžité přesměrování na domovský feed
    router.push('/domu')
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 my-auto">
        
        <div className="text-center mb-8">
          <Link href="/" className="inline-block text-4xl animate-bounce mb-2">
            🐾
          </Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Registrace do PawMeet
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Vytvořte profil pro sebe i svého mazlíčka. Položky s <span className="text-red-500 font-bold">*</span> jsou povinné.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          
          {/* SEKCE: ÚČET */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800 text-indigo-600 dark:text-indigo-400">
              🔐 Přihlašovací údaje
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  E-mail <span className="text-red-500">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="vás@email.cz"
                  onBlur={(e) => checkEmailExists(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
                
                {/* Indikátor kontroly e-mailu */}
                {emailStatus === 'checking' && (
                  <p className="text-xs text-gray-500 mt-1 ml-1">Ověřuji e-mail...</p>
                )}
                {emailStatus === 'valid' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-1 font-medium">✓ E-mail je k dispozici</p>
                )}
                {emailStatus === 'exists' && (
                  <div className="mt-2 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50">
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mb-1">
                      ⚠️ Tento e-mail už v systému existuje.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <input
                        type="checkbox"
                        checked={allowMultiAccount}
                        onChange={(e) => setAllowMultiAccount(e.target.checked)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      Vytvořit další profil pod tímto e-mailem
                    </label>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Uživatelské jméno <span className="text-red-500">*</span>
                </label>
                <input
                  name="username"
                  type="text"
                  required
                  placeholder="jannovak"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Heslo <span className="text-red-500">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Potvrzení hesla <span className="text-red-500">*</span>
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* SEKCE: OSOBNÍ ÚDAJE */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800 text-indigo-600 dark:text-indigo-400">
              👤 Informace o majiteli
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Jméno
                </label>
                <input
                  name="firstName"
                  type="text"
                  placeholder="Jan"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Příjmení
                </label>
                <input
                  name="lastName"
                  type="text"
                  placeholder="Novák"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Datum narození
                </label>
                <input
                  name="birthDate"
                  type="date"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Město
                </label>
                <input
                  name="city"
                  type="text"
                  placeholder="Praha"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                Bio (O mně)
              </label>
              <textarea
                name="bio"
                rows={2}
                placeholder="Něco krátkého o vás..."
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
              />
            </div>
          </div>

          {/* SEKCE: MAZLÍČEK */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800 text-indigo-600 dark:text-indigo-400">
              🐶 Informace o mazlíčkovi
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Jméno mazlíčka <span className="text-red-500">*</span>
                </label>
                <input
                  name="petName"
                  type="text"
                  required
                  placeholder="Rex"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Druh zvířete <span className="text-red-500">*</span>
                </label>
                <select
                  name="petType"
                  required
                  defaultValue=""
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                >
                  <option value="" disabled>Vyberte druh...</option>
                  <option value="pes">Pes 🐶</option>
                  <option value="kocka">Kočka 🐱</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Plemeno <span className="text-red-500">*</span>
                </label>
                <input
                  name="petBreed"
                  type="text"
                  required
                  placeholder="Zlatý retrívr"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Datum narození zvířete <span className="text-red-500">*</span>
                </label>
                <input
                  name="petBirthDate"
                  type="date"
                  required
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Pohlaví <span className="text-red-500">*</span>
                </label>
                <select
                  name="petGender"
                  required
                  defaultValue=""
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                >
                  <option value="" disabled>Vyberte...</option>
                  <option value="kluk">Kluk ♂</option>
                  <option value="holka">Holka ♀</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Velikost
                </label>
                <select
                  name="petSize"
                  defaultValue="stredni"
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                >
                  <option value="maly">Malý</option>
                  <option value="stredni">Střední</option>
                  <option value="velky">Velký</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Povaha
                </label>
                <input
                  name="petNature"
                  type="text"
                  placeholder="Hravý, přátelský, klidný..."
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Oblíbené aktivity
                </label>
                <input
                  name="petActivities"
                  type="text"
                  placeholder="Frisbee, procházky v lese..."
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || (emailStatus === 'exists' && !allowMultiAccount)}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-4 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Vytvářím účet...' : 'Zaregistrovat se 🚀'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Již máte účet?{' '}
          <Link
            href="/login"
            className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1"
          >
            Přihlaste se
          </Link>
        </div>

      </div>
    </div>
  )
}