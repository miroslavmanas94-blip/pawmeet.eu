import { signupAction } from './actions'
import Link from 'next/link'

export default async function RegisterPage(props: {
  searchParams: Promise<{ error?: string }>
}) {
  const searchParams = await props.searchParams
  const error = searchParams?.error

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 my-8">
        
        <h1 className="text-3xl font-black text-center bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent mb-2">
          Registrace do Pawmeet 🐾
        </h1>
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-6">
          Položky označené <span className="text-red-500 font-bold">*</span> jsou povinné
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}

        <form action={signupAction} className="space-y-5">
          
          {/* OSOBNÍ ÚDAJE */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold border-b pb-1 border-gray-200 dark:border-gray-800 text-indigo-600 dark:text-indigo-400">
              👤 Údaje o uživateli
            </h2>

            {/* Email * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                E-mail <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="jan@example.cz"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Heslo * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Heslo <span className="text-red-500">*</span>
              </label>
              <input
                name="password"
                type="password"
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Jméno a Příjmení (NEPOVINNÉ) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Jméno <span className="text-gray-400 font-normal">(nepovinné)</span>
                </label>
                <input
                  name="firstName"
                  type="text"
                  placeholder="Jan"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Příjmení <span className="text-gray-400 font-normal">(nepovinné)</span>
                </label>
                <input
                  name="lastName"
                  type="text"
                  placeholder="Novák"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Uživatelské jméno * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Uživatelské jméno <span className="text-red-500">*</span>
              </label>
              <input
                name="username"
                type="text"
                required
                placeholder="jannovak123"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Datum narození uživatele * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Datum narození <span className="text-red-500">*</span>
              </label>
              <input
                name="birthDate"
                type="date"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* ÚDAJE O MAZLÍČKOVI */}
          <div className="space-y-4 pt-4">
            <h2 className="text-lg font-bold border-b pb-1 border-gray-200 dark:border-gray-800 text-indigo-600 dark:text-indigo-400">
              🐶 Údaje o mazlíčkovi
            </h2>

            {/* Jméno mazlíčka * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Jméno mazlíčka <span className="text-red-500">*</span>
              </label>
              <input
                name="petName"
                type="text"
                required
                placeholder="Alík"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Pes / Kočka * a Pohlaví Kluk / Holka * */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Druh zvířete <span className="text-red-500">*</span>
                </label>
                <select
                  name="petType"
                  required
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Vyberte...</option>
                  <option value="pes">Pes 🐶</option>
                  <option value="kocka">Kočka 🐱</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                  Pohlaví zvířete <span className="text-red-500">*</span>
                </label>
                <select
                  name="petGender"
                  required
                  defaultValue=""
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="" disabled>Vyberte...</option>
                  <option value="kluk">Kluk ♂</option>
                  <option value="holka">Holka ♀</option>
                </select>
              </div>
            </div>

            {/* Plemeno * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Plemeno <span className="text-red-500">*</span>
              </label>
              <input
                name="petBreed"
                type="text"
                required
                placeholder="Zlatý retrívr, Míšenec, ..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Datum narození zvířete * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1">
                Datum narození zvířete <span className="text-red-500">*</span>
              </label>
              <input
                name="petBirthDate"
                type="date"
                required
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-90 text-white font-black rounded-2xl shadow-lg transition-all text-base mt-6"
          >
            Zaregistrovat se 🐾
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/login" className="text-xs text-gray-500 dark:text-gray-400 font-bold hover:underline">
            Již máte účet? Přihlaste se
          </Link>
        </div>

      </div>
    </div>
  )
}