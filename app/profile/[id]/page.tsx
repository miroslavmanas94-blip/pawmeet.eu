'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Profile = {
  id: string
  username: string
  full_name?: string
  avatar_url?: string
  bio?: string
  website?: string
  avatar_scale?: number
  avatar_x?: number
  avatar_y?: number
}

type Post = {
  id: string
  media_url?: string
  image_url?: string
  media_type?: 'image' | 'video'
}

const isUuid = (val: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const profileIdParam = params?.id as string

  const [profile, setProfile] = useState<Profile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Stavy pro modální okno úpravy profilu
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editForm, setEditForm] = useState<Profile | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewAvatarUrl, setPreviewAvatarUrl] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isOwnProfile = Boolean(currentUserId && profile && currentUserId === profile.id)

  useEffect(() => {
    if (!profileIdParam) return

    const loadProfileData = async () => {
      setLoading(true)
      const supabase = createClient()

      // 1. Zjistit přihlášeného uživatele
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setCurrentUserId(user.id)
      }

      // 2. Načíst profil uživatele podle UUID nebo username
      const searchColumn = isUuid(profileIdParam) ? 'id' : 'username'
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq(searchColumn, profileIdParam)
        .maybeSingle()

      if (profileError) {
        console.error('Chyba při načítání profilu:', profileError.message)
      }

      if (profileData) {
        setProfile(profileData)
        setEditForm(profileData)
        setPreviewAvatarUrl(profileData.avatar_url || '')

        const targetUserId = profileData.id

        // 3. Načíst příspěvky uživatele
        const { data: postsData } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', targetUserId)
          .order('created_at', { ascending: false })

        if (postsData) setPosts(postsData as Post[])

        // 4. Počet sledujících a sledovaných
        try {
          const { count: followers } = await supabase
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', targetUserId)

          const { count: following } = await supabase
            .from('followers')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', targetUserId)

          setFollowersCount(followers || 0)
          setFollowingCount(following || 0)
        } catch (e) {
          // Ignorujeme, pokud tabulka followers neexistuje
        }

        // 5. Kontrola, zda ho přihlášený uživatel už sleduje
        if (user && user.id !== targetUserId) {
          const { data: followCheck } = await supabase
            .from('followers')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', targetUserId)
            .maybeSingle()

          if (followCheck) setIsFollowing(true)
        }
      }

      setLoading(false)
    }

    loadProfileData()
  }, [profileIdParam])

  // Přepnutí sledování
  const handleFollowToggle = async () => {
    if (!currentUserId || !profile || isOwnProfile) return
    const supabase = createClient()
    const targetUserId = profile.id

    if (isFollowing) {
      setIsFollowing(false)
      setFollowersCount((prev) => Math.max(0, prev - 1))
      await supabase
        .from('followers')
        .delete()
        .eq('follower_id', currentUserId)
        .eq('following_id', targetUserId)
    } else {
      setIsFollowing(true)
      setFollowersCount((prev) => prev + 1)
      await supabase
        .from('followers')
        .insert({ follower_id: currentUserId, following_id: targetUserId })
    }
  }

  // Výběr souboru
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      setSelectedFile(file)
      setPreviewAvatarUrl(URL.createObjectURL(file))
    }
  }

  // Uložení profilu
  const handleSaveProfile = async () => {
    if (!editForm || !currentUserId) return
    setSaving(true)
    const supabase = createClient()

    try {
      let finalAvatarUrl = editForm.avatar_url || ''

      // 1. Nahraní nové fotky do Supabase Storage
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const filePath = `${currentUserId}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedFile, {
            upsert: true,
            contentType: selectedFile.type
          })

        if (uploadError) {
          console.error('Chyba při nahrávání obrázku:', uploadError.message)
          alert('Nepodařilo se nahrát fotku. Ověřte, že máte v Supabase Storage vytvořený veřejný bucket "avatars".')
        } else {
          const { data: publicUrlData } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath)
          finalAvatarUrl = publicUrlData.publicUrl
        }
      }

      // 2. Příprava dat pro aktualizaci
      const updatedPayload: Record<string, any> = {
        username: editForm.username,
        full_name: editForm.full_name || '',
        bio: editForm.bio || '',
        website: editForm.website || '',
        avatar_url: finalAvatarUrl,
        updated_at: new Date().toISOString()
      }

      if (editForm.avatar_scale !== undefined) updatedPayload.avatar_scale = editForm.avatar_scale
      if (editForm.avatar_x !== undefined) updatedPayload.avatar_x = editForm.avatar_x
      if (editForm.avatar_y !== undefined) updatedPayload.avatar_y = editForm.avatar_y

      // 3. Uložení do tabulky profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update(updatedPayload)
        .eq('id', currentUserId)

      if (updateError) {
        console.error('Chyba při aktualizaci profilu:', updateError)
        alert('Chyba při ukládání profilu: ' + updateError.message)
      } else {
        setProfile({ ...editForm, avatar_url: finalAvatarUrl })
        setIsEditModalOpen(false)
      }
    } catch (err) {
      console.error('Neočekávaná chyba:', err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-12 text-slate-400">Načítám profil...</div>
  }

  if (!profile) {
    return <div className="text-center py-12 text-slate-500">Profil nenalezen.</div>
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 pb-24 text-slate-900">
      {/* Horní lišta s tlačítkem Zpět */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-sm shadow-sm hover:bg-slate-50 cursor-pointer"
        >
          ←
        </button>
        <h1 className="text-lg font-bold">@{profile.username}</h1>
      </div>

      {/* Info hlavička profilu */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm mb-6">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-slate-100 overflow-hidden border-2 border-indigo-500 flex-shrink-0 relative">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="w-full h-full object-cover"
                style={{
                  transform: `translate(${profile.avatar_x || 0}px, ${profile.avatar_y || 0}px) scale(${profile.avatar_scale || 1})`
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">🐾</div>
            )}
          </div>

          <div className="flex-1 flex justify-around text-center">
            <div>
              <div className="font-bold text-base">{posts.length}</div>
              <div className="text-xs text-slate-500">Příspěvky</div>
            </div>
            <div>
              <div className="font-bold text-base">{followersCount}</div>
              <div className="text-xs text-slate-500">Sledující</div>
            </div>
            <div>
              <div className="font-bold text-base">{followingCount}</div>
              <div className="text-xs text-slate-500">Sleduje</div>
            </div>
          </div>
        </div>

        {/* Jméno a Bio */}
        <div className="mt-4">
          <h2 className="font-bold text-sm">{profile.full_name || profile.username}</h2>
          {profile.bio && <p className="text-xs text-slate-600 mt-1 whitespace-pre-line">{profile.bio}</p>}
          {profile.website && (
            <a
              href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 font-semibold block mt-1 hover:underline"
            >
              🔗 {profile.website}
            </a>
          )}
        </div>

        {/* Tlačítka Akcí */}
        <div className="flex gap-3 mt-5">
          {isOwnProfile ? (
            <button
              onClick={() => {
                setEditForm(profile)
                setPreviewAvatarUrl(profile.avatar_url || '')
                setIsEditModalOpen(true)
              }}
              className="flex-1 py-2.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 hover:bg-slate-200 transition-all shadow-sm cursor-pointer"
            >
              Upravit profil
            </button>
          ) : (
            <>
              <button
                onClick={handleFollowToggle}
                className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm cursor-pointer ${
                  isFollowing
                    ? 'bg-slate-100 text-slate-800 border border-slate-300'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                }`}
              >
                {isFollowing ? 'Sledujete' : 'Sledovat'}
              </button>

              <button
                onClick={() => router.push(`/chat?userId=${profile.id}`)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl border border-slate-200 hover:bg-slate-200 transition-all shadow-sm cursor-pointer"
              >
                Zpráva
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mřížka příspěvků */}
      <div className="border-t border-slate-200 pt-4">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Příspěvky</h3>
        {posts.length === 0 ? (
          <p className="text-center text-slate-400 py-10 text-xs">Zatím žádné příspěvky.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
            {posts.map((post) => {
              const url = post.media_url || post.image_url
              return (
                <div key={post.id} className="aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200/60 relative">
                  {post.media_type === 'video' ? (
                    <video src={url} className="w-full h-full object-cover" />
                  ) : (
                    <img src={url} alt="Post" className="w-full h-full object-cover" />
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal okno pro úpravu profilu */}
      {isEditModalOpen && editForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-8 text-slate-900">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100 mb-6">
              <h3 className="text-lg font-extrabold">Upravit profil</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-700 text-xl font-bold cursor-pointer">
                ✕
              </button>
            </div>

            {/* Náhled a nastavení fotky */}
            <div className="flex flex-col items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 mb-6">
              <div className="w-28 h-28 rounded-full overflow-hidden border-2 border-indigo-500 relative bg-slate-200 flex items-center justify-center">
                {previewAvatarUrl ? (
                  <img
                    src={previewAvatarUrl}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `translate(${editForm.avatar_x || 0}px, ${editForm.avatar_y || 0}px) scale(${editForm.avatar_scale || 1})`
                    }}
                  />
                ) : (
                  <span className="text-3xl">🐾</span>
                )}
              </div>

              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2 rounded-xl shadow transition cursor-pointer"
              >
                Vybrat fotku
              </button>

              {/* Posuvníky Zoom a Posun */}
              <div className="w-full space-y-3 pt-2 text-xs">
                <div>
                  <div className="flex justify-between text-slate-500 mb-1 font-semibold">
                    <span>Přiblížení (Zoom):</span>
                    <span>{Number(editForm.avatar_scale || 1).toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={editForm.avatar_scale || 1}
                    onChange={(e) => setEditForm({ ...editForm, avatar_scale: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Posun X:</span>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editForm.avatar_x || 0}
                      onChange={(e) => setEditForm({ ...editForm, avatar_x: parseInt(e.target.value) })}
                      className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold block mb-1">Posun Y:</span>
                    <input
                      type="range"
                      min="-50"
                      max="50"
                      value={editForm.avatar_y || 0}
                      onChange={(e) => setEditForm({ ...editForm, avatar_y: parseInt(e.target.value) })}
                      className="w-full accent-indigo-600 bg-slate-200 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Vstupní formulář */}
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Uživatelské jméno</label>
                <input
                  type="text"
                  value={editForm.username || ''}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Celé jméno</label>
                <input
                  type="text"
                  value={editForm.full_name || ''}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Bio</label>
                <textarea
                  rows={3}
                  value={editForm.bio || ''}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-600 mb-1">Web</label>
                <input
                  type="text"
                  value={editForm.website || ''}
                  onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Tlačítka Storno / Uložit */}
            <div className="flex gap-3 pt-6 border-t border-slate-100 mt-6">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 font-bold py-2.5 rounded-xl text-xs text-slate-700 cursor-pointer"
              >
                Zrušit
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveProfile}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 font-bold py-2.5 rounded-xl text-xs text-white shadow-md cursor-pointer disabled:opacity-50"
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