'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function NewPostPage() {
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [petTag, setPetTag] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setErrorMsg('Prosím vyberte fotku nebo video.')
      return
    }

    setLoading(true)
    setErrorMsg('')
    const supabase = createClient()

    try {
      // 1. Získání aktuálního uživatele
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error('Pro přidání příspěvku musíte být přihlášeni.')

      // 2. Nahrání souboru do Supabase Storage (bucket 'posts')
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 3. Získání veřejné URL adresy nahraného souboru
      const { data: publicUrlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath)

      const mediaUrl = publicUrlData.publicUrl
      const mediaType = file.type.startsWith('video') ? 'video' : 'image'

      // 4. Zápis příspěvku do tabulky 'posts' v databázi
      const { error: insertError } = await supabase.from('posts').insert({
        user_id: user.id,
        caption,
        media_url: mediaUrl,
        media_type: mediaType,
        location: location || null,
        pet_tag: petTag || null,
        likes_count: 0,
      })

      if (insertError) throw insertError

      // Úspěch - přesměrování na domovský feed
      router.push('/domu')
      router.refresh()

    } catch (err: any) {
      setErrorMsg(err.message || 'Nastala chyba při vytváření příspěvku.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-black dark:text-white p-4 pb-24">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 shadow-xl border border-gray-100 dark:border-gray-800">
        
        {/* Hlavička */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/domu" className="text-xl font-bold">✕</Link>
          <h1 className="text-lg font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            Nový příspěvek
          </h1>
          <div className="w-6"></div> {/* Pro zarovnání */}
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleCreatePost} className="space-y-4">
          
          {/* Výběr souboru */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">
              Fotka nebo video mazlíčka
            </label>
            <input
              type="file"
              accept="image/*,video/*"
              required
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-2xl file:border-0 file:text-xs file:font-bold file:bg-indigo-50 dark:file:bg-indigo-950 file:text-indigo-600 dark:file:text-indigo-400 hover:file:bg-indigo-100 transition-all cursor-pointer"
            />
          </div>

          {/* Popisek */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">
              Popisek
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Co dnes váš mazlíček provedl?"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none"
            />
          </div>

          {/* Lokalita */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">
              Místo / Lokalita (Nepovinné)
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="např. Park Stromovka, Praha"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>

          {/* Označení mazlíčka */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1 ml-1">
              Jméno mazlíčka / Plemeno (Nepovinné)
            </label>
            <input
              type="text"
              value={petTag}
              onChange={(e) => setPetTag(e.target.value)}
              placeholder="např. Zlatý retrívr Rex"
              className="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-transparent focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>

          {/* Tlačítko pro odeslání */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black text-base rounded-2xl shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 mt-2"
          >
            {loading ? 'Sdílím příspěvek... 🐾' : 'Sdílet zážitek 🚀'}
          </button>
        </form>

      </div>
    </div>
  )
}