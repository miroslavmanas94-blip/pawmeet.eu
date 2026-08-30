'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  username: string
  avatar_url?: string
  bio?: string
}

export default function SearchPage() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true)
      setErrorMessage(null)
      const supabase = createClient()

      // Načtení ID přihlášeného uživatele
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // Načtení všech profilů z databáze
      const { data, error } = await supabase
        .from('profiles')
        .select('*')

      if (error) {
        console.error('Chyba při načítání profilů:', error)
        setErrorMessage(error.message)
      } else if (data) {
        setProfiles(data)
      }
      
      setLoading(false)
    }

    fetchProfiles()
  }, [])

  // Filtrování podle jména a vynechání vlastního profilu
  const filteredProfiles = profiles.filter((p) =>
    p.id !== currentUserId &&
    (p.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-8 pb-24 md:pb-12 text-neutral-900">
      {/* Hlavička */}
      <h1 className="text-2xl font-black mb-6 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">
        Hledat uživatele
      </h1>

      {/* Vyhledávací pole */}
      <div className="relative mb-6">
        <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-neutral-400 pointer-events-none">
          🔍
        </span>
        <input
          type="text"
          placeholder="Hledat podle jména..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm"
        />
      </div>

      {/* Chybové hlášení */}
      {errorMessage && (
        <div className="p-4 mb-6 bg-red-50 text-red-600 rounded-2xl border border-red-200 text-sm">
          Chyba databáze: {errorMessage}
        </div>
      )}

      {/* Načítání a výsledky */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-neutral-400">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">Načítám profily...</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProfiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              className="flex items-center justify-between p-3.5 bg-white hover:bg-neutral-50 rounded-2xl border border-neutral-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer active:scale-[0.99] group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-12 h-12 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200 flex-shrink-0 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.username || 'Avatar'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl">🐾</span>
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-sm text-neutral-800 group-hover:text-indigo-600 transition-colors truncate">
                    {profile.username || 'Uživatel bez jména'}
                  </h3>
                  {profile.bio && (
                    <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{profile.bio}</p>
                  )}
                </div>
              </div>

              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-full group-hover:bg-indigo-100 transition-all flex-shrink-0 ml-2">
                Zobrazit
              </span>
            </Link>
          ))}

          {!loading && filteredProfiles.length === 0 && (
            <div className="text-center text-neutral-400 py-12">
              <span className="text-3xl block mb-2">🐶</span>
              <p className="text-sm">Žádné profily nenalezeny.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}