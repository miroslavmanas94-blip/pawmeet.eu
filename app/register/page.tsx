import { registerUser } from './actions'
import Link from 'next/link'

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 py-12 px-4 flex items-center justify-center">
      
      <div className="max-w-2xl w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 relative">
        
        {/* Dekorace */}
        <div className="absolute -top-6 -left-6 text-4xl animate-bounce">🎾</div>
        <div className="absolute -bottom-6 -right-6 text-4xl animate-bounce delay-300">🐟</div>

        <div className="text-center mb-10">
          <h1 className="text-4xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Nová smečka začíná zde!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">
            Zabere to jen minutku a váš mazlíček získá tisíce kámošů.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium animate-pulse">
            ⚠️ {decodeURIComponent(error)}
          </div>
        )}

        <form action={registerUser} className="space-y-10">
          
          {/* SEKCE 1: ÚČET */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">1</div>
              <h3 className="text-xl font-bold">Bezpečný přístup</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="email" name="email" required placeholder="E-mailová adresa" className="input-field" />
              <input type="password" name="password" required placeholder="Silné heslo" className="input-field" />
            </div>
          </section>

          {/* SEKCE 2: MAJITEL */}
          <section>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm">2</div>
              <h3 className="text-xl font-bold">O vás (páníček)</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" name="firstName" required placeholder="Vaše jméno" className="input-field" />
              <input type="text" name="lastName" required placeholder="Vaše příjmení" className="input-field" />
              <input type="text" name="username" required placeholder="Uživatelské jméno (např. rex_master)" className="input-field" />
              <input type="text" name="city" required placeholder="Město" className="input-field" />
              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-gray-400 ml-2 mb-1 block uppercase">Datum narození</label>
                <input type="date" name="ownerBirthDate" className="input-field" />
              </div>
            </div>
          </section>

          {/* SEKCE 3: MAZLÍČEK */}
          <section className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-sm">3</div>
              <h3 className="text-xl font-bold">Váš čtyřnohý parťák</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input type="text" name="petName" required placeholder="Jméno mazlíčka" className="input-field" />
              <select name="petType" className="input-field">
                <option value="pes">🐶 Pes</option>
                <option value="kocka">🐱 Kočka</option>
              </select>
              <input type="text" name="petBreed" placeholder="Plemeno" className="input-field" />
              <select name="petGender" className="input-field">
                <option value="Kluk">Kluk / Kocour</option>
                <option value="Holka">Holka / Fena</option>
              </select>
              <div className="sm:col-span-2">
                 <input type="text" name="petTemperament" placeholder="Povaha (hravý, klidný, hlídač...)" className="input-field" />
              </div>
            </div>
          </section>

          <button type="submit" className="w-full py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-black text-xl rounded-2xl shadow-xl hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-95 transition-all duration-200">
            Vstoupit do světa PawMeet 🐾
          </button>
        </form>

        <p className="text-center mt-8 text-gray-500 dark:text-gray-400 font-medium">
          Už jsi členem? <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">Přihlas se</Link>
        </p>
      </div>

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.875rem 1.25rem;
          border-radius: 1rem;
          border: 1px solid rgba(209, 213, 219, 0.5);
          background: rgba(255, 255, 255, 0.5);
          outline: none;
          transition: all 0.2s;
        }
        :global(.dark) .input-field {
          background: rgba(17, 24, 39, 0.5);
          border-color: rgba(55, 65, 81, 0.5);
        }
        .input-field:focus {
          border-color: #6366f1;
          box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
      `}</style>
    </div>
  )
}