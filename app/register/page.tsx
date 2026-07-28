'use client'

import { useState } from 'react'
import { registerUser } from './actions'
import Link from 'next/link'

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const inputStyle = "w-full px-5 py-3.5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/60 dark:bg-gray-800/60 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-indigo-50 to-purple-100 dark:from-gray-950 dark:via-indigo-950/40 dark:to-purple-950/30 text-gray-900 dark:text-gray-100 py-12 px-4 flex items-center justify-center">
      
      <div className="max-w-lg w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-gray-800/80 relative overflow-hidden">
        
        {/* Indikátor průběhu (Progress bar) */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2 px-1">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              Krok {step} ze 3
            </span>
            <span className="text-xs font-bold text-gray-400">
              {step === 1 && '🔑 Účet'}
              {step === 2 && '👤 Páníček'}
              {step === 3 && '🐾 Mazlíček'}
            </span>
          </div>
          <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-600 to-purple-600 transition-all duration-300 ease-out"
              style={{ width: `${(step / 3) * 100}%` }}
            ></div>
          </div>
        </div>

        <form action={registerUser}>
          
          {/* KROK 1: ÚČET */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Vytvořte si přístup
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  Zadejte údaje, kterými se budete přihlašovat.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">E-mail</label>
                <input type="email" name="email" required placeholder="příklad@email.cz" className={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">Heslo</label>
                <input type="password" name="password" required placeholder="Alespoň 6 znaků" className={inputStyle} />
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-base rounded-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all mt-4"
              >
                Pokračovat na profil ➔
              </button>
            </div>
          )}

          {/* KROK 2: MAJITEL */}
          {step === 2 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Něco o vás
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  Ať ostatní v okolí vědí, s kým si píšou.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="firstName" required placeholder="Jméno" className={inputStyle} />
                <input type="text" name="lastName" required placeholder="Příjmení" className={inputStyle} />
              </div>
              <input type="text" name="username" required placeholder="Uživatelské jméno (např. rex_master)" className={inputStyle} />
              <input type="text" name="city" required placeholder="Město (např. Praha)" className={inputStyle} />
              <div>
                <label className="text-xs font-bold text-gray-400 ml-1 mb-1 block uppercase">Datum narození</label>
                <input type="date" name="ownerBirthDate" className={inputStyle} />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="w-1/3 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 transition"
                >
                  ⬅ Zpět
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="w-2/3 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all"
                >
                  Přidat mazlíčka ➔
                </button>
              </div>
            </div>
          )}

          {/* KROK 3: MAZLÍČEK */}
          {step === 3 && (
            <div className="space-y-4 animate-fadeIn">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-black bg-gradient-to-r from-amber-500 to-purple-600 bg-clip-text text-transparent">
                  Váš parťák 🐾
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                  To nejdůležitější na PawMeet!
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="petName" required placeholder="Jméno mazlíčka" className={inputStyle} />
                <select name="petType" className={inputStyle}>
                  <option value="pes">🐶 Pes</option>
                  <option value="kocka">🐱 Kočka</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" name="petBreed" placeholder="Plemeno" className={inputStyle} />
                <select name="petGender" className={inputStyle}>
                  <option value="Kluk">Kluk / Kocour</option>
                  <option value="Holka">Holka / Fena</option>
                </select>
              </div>
              <input type="text" name="petTemperament" placeholder="Povaha (hravý, energický, stydlivý...)" className={inputStyle} />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="w-1/3 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 transition"
                >
                  ⬅ Zpět
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white font-black text-lg rounded-2xl shadow-xl hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Dokončit 🚀
                </button>
              </div>
            </div>
          )}

        </form>

        <p className="text-center mt-8 text-sm text-gray-500 dark:text-gray-400 font-medium">
          Už máte účet?{' '}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline ml-1">
            Přihlaste se
          </Link>
        </p>

      </div>
    </div>
  )
}