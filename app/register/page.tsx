import { registerUser } from './actions'
import Link from 'next/link'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-12 px-4 sm:px-6 lg:px-8 text-gray-900 dark:text-gray-100 flex items-center justify-center">
      <div className="max-w-2xl w-full space-y-8 bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800">
        
        {/* Hlavička */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-indigo-600 dark:text-indigo-400">
            PawMeet 🐾
          </h1>
          <h2 className="mt-2 text-2xl font-bold">Vytvořte si nový účet</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Připojte se k světové komunitě milovníků psů a koček.
          </p>
        </div>

        {/* Chybová hláška */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm font-medium">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}

        <form action={registerUser} className="space-y-8">
          
          {/* SEKCE 1: ÚČET */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-800 pb-2 text-indigo-600 dark:text-indigo-400">
              1. Přihlašovací údaje
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">E-mail *</label>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="tvuj@email.cz"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Heslo *</label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="Minimálně 6 znaků"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* SEKCE 2: INFORMACE O MAJITELI */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-800 pb-2 text-indigo-600 dark:text-indigo-400">
              2. O majiteli
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jméno *</label>
                <input
                  type="text"
                  name="firstName"
                  required
                  placeholder="Petr"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Příjmení *</label>
                <input
                  type="text"
                  name="lastName"
                  required
                  placeholder="Novák"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Uživatelské jméno *</label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="petr_novak"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Datum narození</label>
                <input
                  type="date"
                  name="ownerBirthDate"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Město *</label>
                <input
                  type="text"
                  name="city"
                  required
                  placeholder="Praha"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bio (krátce o sobě)</label>
              <textarea
                name="bio"
                rows={2}
                placeholder="Rád chodím na dlouhé procházky do přírody..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
              />
            </div>
          </div>

          {/* SEKCE 3: INFORMACE O MAZLÍČKOVI */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b border-gray-200 dark:border-gray-800 pb-2 text-indigo-600 dark:text-indigo-400">
              3. Váš mazlíček
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Jméno mazlíčka *</label>
                <input
                  type="text"
                  name="petName"
                  required
                  placeholder="Alík"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Druh mazlíčka *</label>
                <select
                  name="petType"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="pes">🐶 Pes</option>
                  <option value="kocka">🐱 Kočka</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Plemeno</label>
                <input
                  type="text"
                  name="petBreed"
                  placeholder="Zlatý retrívr, Mývalí kočka..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Datum narození mazlíčka</label>
                <input
                  type="date"
                  name="petBirthDate"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Pohlaví</label>
                <select
                  name="petGender"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="Pes/Kocour">Pes / Kocour</option>
                  <option value="Fena/Kočka">Fena / Kočka</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Velikost</label>
                <select
                  name="petSize"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                >
                  <option value="Malý">Malý (do 10 kg)</option>
                  <option value="Střední">Střední (10 - 25 kg)</option>
                  <option value="Velký">Velký (nad 25 kg)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Povaha</label>
                <input
                  type="text"
                  name="petTemperament"
                  placeholder="Přátelský, Hravý, Klidný..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Oblíbené aktivity</label>
                <input
                  type="text"
                  name="petActivities"
                  placeholder="Aportování, Běhání, Plavání (oddělte čárkou)"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Odesílací tlačítko */}
          <button
            type="submit"
            className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition duration-200"
          >
            Dokončit registraci a vstoupit do PawMeet
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
          Již máte účet?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
            Přihlaste se zde
          </Link>
        </p>

      </div>
    </div>
  )
}