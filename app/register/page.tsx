import { registerUser } from './actions'
import Link from 'next/link'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 relative overflow-hidden my-8">
        
        <div className="text-center mb-6">
          <Link href="/" className="inline-block text-4xl mb-2">
            🐾
          </Link>
          <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Registrace do PawMeet
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            Vyplňte údaje a vytvořte profil své smečky.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}

        <form action={registerUser} className="space-y-4">
          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              👤 Údaje páníčka
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Jméno *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  placeholder="Jan"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Příjmení *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  placeholder="Novák"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Uživatelské jméno *</label>
              <input
                type="text"
                name="username"
                required
                placeholder="honzanovac"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="jan@novak.cz"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Město (volitelné)</label>
                <input
                  type="text"
                  name="city"
                  placeholder="Praha"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Heslo *</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                placeholder="Alespoň 6 znaků"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          <hr className="border-gray-200 dark:border-gray-800 my-4" />

          <div className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              🐶 Údaje o mazlíčkovi
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Jméno mazlíčka *</label>
                <input
                  type="text"
                  name="petName"
                  required
                  placeholder="Rex"
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Druh *</label>
                <select
                  name="petType"
                  required
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                >
                  <option value="pes">Pes 🐶</option>
                  <option value="kocka">Kočka 🐱</option>
                  <option value="jine">Jiné 🐾</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-400 mb-1 ml-1">Plemeno *</label>
              <input
                type="text"
                name="petBreed"
                required
                placeholder="Německý ovčák / Kříženec"
                className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-lg rounded-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all mt-4"
          >
            Vytvořit účet a vstoupit 🐾
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400 font-medium">
          Již máte účet?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1">
            Přihlaste se
          </Link>
        </div>

      </div>
    </div>
  )
}