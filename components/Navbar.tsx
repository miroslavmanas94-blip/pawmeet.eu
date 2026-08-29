import React from 'react'
import { GoogleTranslate } from './GoogleTranslate'

export const Navbar = () => {
  return (
    <header className="flex justify-between items-center p-4 bg-white shadow">
      <div className="logo font-bold text-xl">🐾 PawMeet</div>

      <div className="flex items-center gap-4">
        {/* Zde je komponenta pro překlad */}
        <GoogleTranslate />

        <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
          Přihlásit se
        </button>
      </div>
    </header>
  )
}