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

  // Filtrování: vyhledávání podle jména a vynechání vlastního profilu
  const filteredProfiles = profiles.filter((p) =>
    p.id !== currentUserId &&
    (p.username || '').toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="w-full max-w-4xl mx-auto p-4 pb-24">
      <h1 className="text-xl font-bold mb-4">Hledat uživatele</h1>

      <input
        type="text"
        placeholder="Hledat podle jména..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full p-3 rounded-2xl border border-neutral-200 bg-white shadow-sm outline-none focus:border-indigo-500 mb-6"
      />

      {errorMessage && (
        <div className="p-4 mb-4 bg-red-50 text-red-600 rounded-2xl border border-red-200 text-sm">
          Chyba databáze: {errorMessage}
        </div>
      )}

      {loading ? (
        <p className="text-center text-neutral-400">Načítám profily...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredProfiles.map((profile) => (
            <Link
              key={profile.id}
              href={`/profile/${profile.id}`}
              className="flex items-center justify-between p-3 bg-white rounded-2xl border border-neutral-200/80 shadow-sm hover:border-indigo-300 transition-all cursor-pointer active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-neutral-100 overflow-hidden border border-neutral-200 flex items-center justify-center">
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
                <div>
                  <h3 className="font-bold text-sm">{profile.username || 'Uživatel bez jména'}</h3>
                  {profile.bio && (
                    <p className="text-xs text-neutral-500 line-clamp-1">{profile.bio}</p>
                  )}
                </div>
              </div>

              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                Zobrazit
              </span>
            </Link>
          ))}

          {!loading && filteredProfiles.length === 0 && (
            <p className="text-center text-neutral-400 py-8">Žádné profily nenalezeny.</p>
          )}
        </div>
      )}
    </div>
  )
}