'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

type ProfileData = {
  id: string
  username: string
  full_name: string
  avatar_url: string
  bio: string
  website: string
  posts_count?: number
  followers_count?: number
  following_count?: number
  avatar_scale?: number
  avatar_x?: number
  avatar_y?: number
}

export default function ProfilePage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'posts' | 'saved' | 'tagged'>('posts')

  // Data profilu
  const [profile, setProfile] = useState<ProfileData>({
    id: '',
    username: '',
    full_name: '',
    avatar_url: '',
    bio: '',
    website: '',
    posts_count: 0,
    followers_count: 0,
    following_count: 0,
    avatar_scale: 1,
    avatar_x: 0,
    avatar_y: 0
  })

  // Stavy pro úpravu v modálním okně
  const [editForm, setEditForm] = useState<ProfileData>(profile)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Načtení profilu ze Supabase
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        const loadedProfile: ProfileData = {
          id: user.id,
          username: data?.username || user.user_metadata?.username || user.email?.split('@')[0] || 'uzivatel',
          full_name: data?.full_name || user.user_metadata?.full_name || 'Uživatel',
          avatar_url: data?.avatar_url || user.user_metadata?.avatar_url || '',
          bio: data?.bio || user.user_metadata?.bio || 'Zatím bez popisu',
          website: data?.website || '',
          posts_count: data?.posts_count || 0,
          followers_count: data?.followers_count || 0,
          following_count: data?.following_count || 0,
          avatar_scale: data?.avatar_scale ?? 1,
          avatar_x: data?.avatar_x ?? 0,
          avatar_y: data?.avatar_y ?? 0
        }

        setProfile(loadedProfile)
        setEditForm(loadedProfile)
        setPreviewAvatarUrl(loadedProfile.avatar_url)
      }
      setLoading(false)
    }

    fetchProfile()
  }, [])

  // Prevence úniku paměti u objektových URL
  useEffect(() => {
    return () => {
      if (previewAvatarUrl && previewAvatarUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewAvatarUrl)
      }
    }
  }, [previewAvatarUrl])

  // Otevření editoru
  const handleOpenEdit = () => {
    setEditForm(profile)
    setPreviewAvatarUrl(profile.avatar_url)
    setSelectedFile(null)
    setIsEditModalOpen(true)
  }

  // Výběr nové fotky
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]

      if (!file.type.startsWith('image/')) {
        alert('Vyberte prosím platný obrázek.')
        return
      }

      setSelectedFile(file)
      setPreviewAvatarUrl(URL.createObjectURL(file))
    }
  }

  // Uložení profilu do Supabase
  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      let finalAvatarUrl = editForm.avatar_url

      // Pokud byla nahrána nová fotka, nahrajeme ji do Supabase Storage bucketu 'avatars'
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const filePath = `${editForm.id}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, { upsert: true })

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)

          finalAvatarUrl = publicUrlData.publicUrl
        }
      }

      // Aktualizace tabulky profiles
      const updatedData = {
        id: editForm.id,
        username: editForm.username,
        full_name: editForm.full_name,
        bio: editForm.bio,
        website: editForm.website,
        avatar_url: finalAvatarUrl,
        avatar_scale: editForm.avatar_scale,
        avatar_x: editForm.avatar_x,
        avatar_y: editForm.avatar_y,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase.from('profiles').upsert(updatedData)

      if (!error) {
        setProfile({ ...editForm, avatar_url: finalAvatarUrl })
        setIsEditModalOpen(false)
      } else {
        alert('Chyba při ukládání profilu: ' + error.message)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-950 text-white">
        <div className="animate-spin text-3xl">🌀</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-white flex flex-col items-center">
      {/* Hlavní kontejner – max šířka jako na Instagramu */}
      <div className="w-full max-w-4xl px-4 py-8 flex-1">
        
        {/* HORNÍ SEKCIE: Profilová karta */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-16 pb-10 border-b border-slate-800">
          
          {/* FOTKA S INSTAGRAM PŘÍBĚHOVÝM KRUHEM */}
          <div className="relative group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full p-[3px] bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600">
              <div className="w-full h-full rounded-full bg-slate-950 p-1">
                <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-900 flex items-center justify-center">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover transition-transform"
                      style={{
                        transform: `translate(${profile.avatar_x || 0}px, ${profile.avatar_y || 0}px) scale(${profile.avatar_scale || 1})`
                      }}
                    />
                  ) : (
                    <span className="text-5xl">👤</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* INFORMACE O UŽIVATELI */}
          <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-4">
            
            {/* Radek 1: Nickname + Tlačítko Úprava profilu */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <h1 className="text-2xl font-light tracking-wide">{profile.username}</h1>
              
              <button
                onClick={handleOpenEdit}
                className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold px-4 py-1.5 rounded-lg border border-slate-700 transition"
              >
                Upravit profil
              </button>

              <button className="text-xl p-1.5 text-slate-300 hover:text-white transition">
                ⚙️
              </button>
            </div>

            {/* Radek 2: Statistiky (Příspěvky / Sledující / Sleduji) */}
            <div className="flex items-center gap-8 py-2 text-sm md:text-base border-y md:border-none border-slate-900 w-full justify-center md:justify-start">
              <div>
                <span className="font-bold text-white">{profile.posts_count}</span>{' '}
                <span className="text-slate-400">příspěvků</span>
              </div>
              <div>
                <span className="font-bold text-white">{profile.followers_count}</span>{' '}
                <span className="text-slate-400">sledujících</span>
              </div>
              <div>
                <span className="font-bold text-white">{profile.following_count}</span>{' '}
                <span className="text-slate-400">sleduji</span>
              </div>
            </div>

            {/* Radek 3: Celé jméno, Bio a Web */}
            <div className="text-sm space-y-1">
              <h2 className="font-bold text-slate-100">{profile.full_name}</h2>
              <p className="whitespace-pre-line text-slate-300 max-w-md">{profile.bio}</p>
              {profile.website && (
                <a
                  href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-indigo-400 hover:underline block"
                >
                  🔗 {profile.website.replace(/^https?:\/\//, '')}
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ZÁLOŽKY (Příspěvky / Uložené / Označení) */}
        <div className="flex justify-center border-b border-slate-800 text-xs font-semibold tracking-wider text-slate-400 uppercase">
          <button
            onClick={() => setActiveTab('posts')}
            className={`py-4 px-6 flex items-center gap-2 border-t-2 transition ${
              activeTab === 'posts' ? 'border-white text-white' : 'border-transparent hover:text-slate-200'
            }`}
          >
            🖼️ Příspěvky
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`py-4 px-6 flex items-center gap-2 border-t-2 transition ${
              activeTab === 'saved' ? 'border-white text-white' : 'border-transparent hover:text-slate-200'
            }`}
          >
            🔖 Uložené
          </button>
          <button
            onClick={() => setActiveTab('tagged')}
            className={`py-4 px-6 flex items-center gap-2 border-t-2 transition ${
              activeTab === 'tagged' ? 'border-white text-white' : 'border-transparent hover:text-slate-200'
            }`}
          >
            🏷️ Označení
          </button>
        </div>

        {/* MŘÍŽKA PŘÍSPĚVKŮ (Grid 3 sloupce jako na IG) */}
        <div className="grid grid-cols-3 gap-1 md:gap-4 mt-4">
          {profile.posts_count === 0 ? (
            <div className="col-span-3 py-20 text-center text-slate-500">
              <div className="text-5xl mb-3">📷</div>
              <p className="text-lg font-semibold text-slate-400">Zatím žádné příspěvky</p>
            </div>
          ) : (
            [1, 2, 3, 4, 5, 6].map((item) => (
              <div key={item} className="aspect-square bg-slate-900 rounded-lg overflow-hidden relative group cursor-pointer border border-slate-800/50">
                <img
                  src={`https://picsum.photos/400/400?random=${item}`}
                  alt="Post"
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-6 font-bold">
                  <span>❤️ 12</span>
                  <span>💬 3</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODÁLNÍ OKNO: ÚPRAVA PROFILU A VYCENTROVÁNÍ PROFILOVKY */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative my-8">
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-6">
              <h3 className="text-lg font-bold">Upravit profil</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {/* 1. SEKCIE PROFILOVKY S NASTAVENÍM VYCENTROVÁNÍ */}
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-950/60 rounded-xl border border-slate-800 mb-6">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Úprava profilového obrázku</p>
              
              {/* Zobrazovací kruh s živým náhledem */}
              <div className="w-36 h-36 rounded-full overflow-hidden border-2 border-indigo-500 relative bg-slate-900 flex items-center justify-center">
                {previewAvatarUrl ? (
                  <img
                    src={previewAvatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover pointer-events-none"
                    style={{
                      transform: `translate(${editForm.avatar_x || 0}px, ${editForm.avatar_y || 0}px) scale(${editForm.avatar_scale || 1})`
                    }}
                  />
                ) : (
                  <span className="text-4xl">👤</span>
                )}
              </div>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 font-bold px-3 py-1.5 rounded-lg transition"
              >
                Vybrat novou fotku
              </button>

              {/* POSUVNÍKY PRO VYCENTROVÁNÍ A MĚŘÍTKO */}
              <div className="w-full space-y-3 pt-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-400 mb-1">
                    <span>Přiblížení (Zoom):</span>
                    <span>{Number(editForm.avatar_scale).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={editForm.avatar_scale || 1}
                    onChange={(e) => setEditForm({ ...editForm, avatar_scale: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500 bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Posun X (vlevo/vpravo):</span>
                      <span>{editForm.avatar_x || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editForm.avatar_x || 0}
                      onChange={(e) => setEditForm({ ...editForm, avatar_x: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 bg-slate-800"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-slate-400 mb-1">
                      <span>Posun Y (nahoru/dolů):</span>
                      <span>{editForm.avatar_y || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editForm.avatar_y || 0}
                      onChange={(e) => setEditForm({ ...editForm, avatar_y: parseInt(e.target.value) })}
                      className="w-full accent-indigo-500 bg-slate-800"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. FORMULÁŘ TEXTOVÝCH ÚDAJŮ */}
            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Uživatelské jméno (@username)</label>
                <input
                  type="text"
                  value={editForm.username}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Jméno a příjmení</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Bio (O mně)</label>
                <textarea
                  rows={3}
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Webová stránka</label>
                <input
                  type="text"
                  value={editForm.website}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  placeholder="https://mojestranka.cz"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            {/* TLAČÍTKA ULOŽIT / ZRUŠIT */}
            <div className="flex gap-3 pt-6 border-t border-slate-800 mt-6">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 font-bold py-2.5 rounded-xl transition text-xs"
              >
                Zrušit
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-2"
              >
                {saving ? 'Ukládám...' : 'Uložit změny'}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}