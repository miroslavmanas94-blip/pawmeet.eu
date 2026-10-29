'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function RegisterPage() {
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'exists' | 'valid'>('idle')
  const router = useRouter()

  // Dnešní datum pro kalendář (YYYY-MM-DD)
  const todayStr = new Date().toISOString().split('T')[0]

  // Ověření unikátnosti uživatelského jména
  const checkUsernameExists = async (username: string) => {
    const cleanUsername = username.trim()
    if (!cleanUsername) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')
    const supabase = createClient()

    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle()

      if (data) {
        setUsernameStatus('exists')
      } else {
        setUsernameStatus('valid')
      }
    } catch {
      setUsernameStatus('idle')
    }
  }

  const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    try {
      const supabase = createClient()
      const formData = new FormData(e.currentTarget)

      const rawEmail = (formData.get('email') as string).trim()
      const password = formData.get('password') as string
      const confirmPassword = formData.get('confirmPassword') as string
      const username = (formData.get('username') as string).trim()
      const birthDate = formData.get('birthDate') as string
      const petBirthDate = formData.get('petBirthDate') as string

      // 1. Kontrola shody hesel
      if (password !== confirmPassword) {
        setErrorMsg('Hesla se neshodují.')
        setLoading(false)
        return
      }

      // 2. Kontrola kalendáře (nesmí být v budoucnosti)
      if (birthDate && birthDate > todayStr) {
        setErrorMsg('Datum narození majitele nemůže být v budoucnosti.')
        setLoading(false)
        return
      }
      if (petBirthDate && petBirthDate > todayStr) {
        setErrorMsg('Datum narození mazlíčka nemůže být v budoucnosti.')
        setLoading(false)
        return
      }

      // 3. Nové účty používají skutečnou e-mailovou adresu; starší alias účty mají bezpečný kompatibilní login.
      const authEmail = rawEmail.toLowerCase()

      const firstName = formData.get('firstName') as string
      const lastName = formData.get('lastName') as string
      const city = formData.get('city') as string
      const bio = formData.get('bio') as string

      const petName = formData.get('petName') as string
      const petType = formData.get('petType') as string
      const petBreed = formData.get('petBreed') as string
      const petGender = formData.get('petGender') as string
      const petSize = formData.get('petSize') as string
      const petNature = formData.get('petNature') as string
      const petActivities = formData.get('petActivities') as string

      // 4. Registrace uživatele v Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: authEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=%2Fdomu`,
          data: {
            email: rawEmail,
            original_email: rawEmail,
            username,
            first_name: firstName,
            last_name: lastName,
            birth_date: birthDate || null,
            city,
            bio,
            pending_pet_profile: {
              name: petName,
              type: petType,
              breed: petBreed,
              birth_date: petBirthDate || null,
              gender: petGender,
              size: petSize,
              nature: petNature,
              activities: petActivities,
            },
          },
        },
      })

      if (error) {
        setErrorMsg(error.message || 'Chyba při registrace do systému.')
        setLoading(false)
        return
      }

      // 5. Bez potvrzené relace čekáme na potvrzení e-mailu. Údaje o psovi zůstávají
      // v metadata účtu a po prvním přihlášení se bezpečně doplní do profilu.
      if (!data.session || !data.user) {
        setSuccessMsg('Pokud lze účet vytvořit, poslali jsme na zadaný e-mail potvrzovací odkaz. Otevři e-mail a potvrď adresu; potom se přihlas.')
        setLoading(false)
        return
      }

      const { error: petError } = await supabase.from('pets').insert({
        user_id: data.user.id,
        name: petName,
        type: petType,
        breed: petBreed,
        birth_date: petBirthDate || null,
        gender: petGender,
        size: petSize,
        nature: petNature,
        activities: petActivities,
      })
      if (!petError) {
        await supabase.auth.updateUser({ data: { pending_pet_profile: null } })
      } else {
        console.error('Chyba při ukládání mazlíčka:', petError.message)
      }

      // 6. Přesměrování pouze při existující přihlášené relaci
      router.push('/domu')
      router.refresh()
    } catch (err: any) {
      setErrorMsg(err?.message || 'Nastala neočekávaná chyba.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 w-screen h-screen overflow-y-auto bg-gradient-to-br from-amber-50 via-indigo-50 to-violet-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-violet-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-2xl w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-6 sm:p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 my-auto">
        
        <div className="text-center mb-8">
          <Link href="/" className="mx-auto mb-4 inline-flex items-center justify-center"><img src="/logo.png" alt="PawMeet" className="h-14 w-14 rounded-2xl object-cover" /></Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-[#5B5BF7] to-[#9333EA] bg-clip-text text-transparent">
            Registrace do PawMeet
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Vytvořte profil pro sebe i svého mazlíčka. Položky s <span className="text-red-500 font-bold">*</span> jsou povinné.
          </p>
        </div>

        {errorMsg && (
          <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div role="status" className="mb-6 rounded-2xl border border-[#D8DDFE] bg-[#EEF0FF] p-4 text-sm leading-6 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-6">
          
          {/* SEKCE: ÚČET */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800 text-[#5B5BF7] dark:text-[#A5B4FC]">
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
                />
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
                  onBlur={(e) => checkUsernameExists(e.target.value)}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
                />
                {usernameStatus === 'checking' && (
                  <p className="text-xs text-gray-500 mt-1 ml-1">Ověřuji jméno...</p>
                )}
                {usernameStatus === 'valid' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1 ml-1 font-medium">✓ Uživatelské jméno je volné</p>
                )}
                {usernameStatus === 'exists' && (
                  <p className="text-xs text-red-500 mt-1 ml-1 font-medium">Toto jméno je již obsazené</p>
                )}
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          {/* SEKCE: OSOBNÍ ÚDAJE */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800 text-[#5B5BF7] dark:text-[#A5B4FC]">
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  max={todayStr}
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
              />
            </div>
          </div>

          {/* SEKCE: MAZLÍČEK */}
          <div className="space-y-4 pt-2">
            <h2 className="text-lg font-bold border-b pb-2 border-gray-200 dark:border-gray-800 text-[#5B5BF7] dark:text-[#A5B4FC]">
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1 ml-1">
                  Datum narození zvířete <span className="text-red-500">*</span>
                </label>
                <input
                  name="petBirthDate"
                  type="date"
                  max={todayStr}
                  required
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
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
                  className="w-full px-4 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-[#5B5BF7] outline-none text-sm font-medium"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || usernameStatus === 'exists'}
            className="w-full py-4 bg-gradient-to-r from-[#5B5BF7] to-[#9333EA] hover:from-[#4F46E5] hover:to-[#7E22CE] text-white font-black text-lg rounded-2xl shadow-lg hover:shadow-[#5B5BF7]/25 hover:scale-[1.02] active:scale-95 transition-all duration-200 mt-4 disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Vytvářím účet...' : 'Zaregistrovat se'}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Již máte účet?{' '}
          <Link
            href="/login"
            className="text-[#5B5BF7] dark:text-[#A5B4FC] font-bold hover:underline ml-1"
          >
            Přihlaste se
          </Link>
        </div>

      </div>
    </div>
  )
}
