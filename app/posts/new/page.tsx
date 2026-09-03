'use client'

export const dynamic = 'force-dynamic'

import { useState, useRef, ChangeEvent, DragEvent } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'

export default function NewPostPage() {
  const [caption, setCaption] = useState('')
  const [location, setLocation] = useState('')
  const [petTag, setPetTag] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [fileType, setFileType] = useState<'image' | 'video'>('image')
  const [isDragging, setIsDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Zpracování vybraného souboru
  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return

    const isVideo = selectedFile.type.startsWith('video')
    const isImage = selectedFile.type.startsWith('image')

    if (!isVideo && !isImage) {
      setErrorMsg('Podporovány jsou pouze obrázky a videa.')
      return
    }

    setErrorMsg('')
    setFile(selectedFile)
    setFileType(isVideo ? 'video' : 'image')
    
    // Vytvoření lokální URL pro okamžitý náhled
    const objectUrl = URL.createObjectURL(selectedFile)
    setPreviewUrl(objectUrl)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0])
    }
  }

  // Drag & Drop
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0])
    }
  }

  const handleRemoveFile = () => {
    setFile(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

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
      // 1. Ověření uživatele
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        throw new Error('Pro přidání příspěvku musíte být přihlášeni.')
      }

      // 1.1 Načtení profilu uživatele (jméno, avatar atd.)
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, full_name, avatar_url')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.warn('Nepodařilo se načíst profil uživatele:', profileError.message)
      }

      // 2. Nahrání souboru do Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 3. Získání veřejné URL
      const { data: publicUrlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath)

      const mediaUrl = publicUrlData.publicUrl
      const detectedType = file.type.startsWith('video') ? 'video' : 'image'

      // Uložení media_url ve formátu JSON pole pro kompatibilitu s feedem
      const mediaArray = JSON.stringify([{ url: mediaUrl, type: detectedType }])

      // 4. Zápis do databáze 'posts' včetně údajů o uživateli z profilu
      const { error: insertError } = await supabase.from('posts').insert({
        user_id: user.id,
        caption: caption.trim(),
        media_url: mediaArray,
        media_type: detectedType,
        location: location.trim() || null,
        pet_tag: petTag.trim() || null,
        likes_count: 0,
        username: profileData?.username || null,
        full_name: profileData?.full_name || null,
        avatar_url: profileData?.avatar_url || null,
      })

      if (insertError) throw insertError

      // 5. Úspěch - přesměrování a obnova feedu
      router.push('/domu')
      router.refresh()

    } catch (err: any) {
      console.error('Chyba při vytváření příspěvku:', err)
      setErrorMsg(err.message || 'Nastala chyba při vytváření příspěvku.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 p-4 sm:p-6 pb-28 flex justify-center items-center">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-xl">
        
        {/* Hlavička */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Link
            href="/domu"
            className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition font-bold text-sm"
          >
            ✕
          </Link>
          <h1 className="text-xl font-black bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 bg-clip-text text-transparent">
            Nový příspěvek
          </h1>
          <div className="w-9" />
        </div>

        {/* Chybové hlášení */}
        {errorMsg && (
          <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2 animate-shake">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleCreatePost} className="space-y-5">
          
          {/* UPLOAD ZÓNA (DRAG & DROP) / NÁHLED */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-2 ml-1">
              Médium (Fotka / Reel Video)
            </label>

            {!previewUrl ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 bg-slate-50/50 dark:bg-slate-800/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleInputChange}
                  className="hidden"
                />
                
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl shadow-inner">
                  📸
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Klikněte nebo přetáhněte fotku či video
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    MP4, MOV, JPG, PNG, WEBP (max. 100MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative rounded-3xl overflow-hidden bg-black border border-slate-200 dark:border-slate-800 shadow-md group aspect-square max-h-[380px] w-full flex items-center justify-center">
                
                {/* Zobrazení Náhledu */}
                {fileType === 'video' ? (
                  <video
                    src={previewUrl}
                    controls
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Náhled"
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Štítek s typem souboru */}
                <span className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20">
                  {fileType === 'video' ? '🎬 Video / Reel' : '📸 Fotka'}
                </span>

                {/* Tlačítko pro odstranění */}
                <button
                  type="button"
                  onClick={handleRemoveFile}
                  className="absolute top-3 right-3 bg-rose-600 hover:bg-rose-700 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg transition active:scale-90 font-bold text-xs"
                  title="Odebrat soubor"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* POPISEK */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
              Popisek
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Co váš mazlíček dnes prováděl? 🐾"
                className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none text-sm transition-all resize-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* LOKALITA A MAZLÍČEK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
                📍 Lokalita (Nepovinné)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="např. Park Stromovka"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none text-sm transition-all placeholder:text-slate-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
                🐾 Jméno / Plemeno
              </label>
              <input
                type="text"
                value={petTag}
                onChange={(e) => setPetTag(e.target.value)}
                placeholder="např. Max (Retrívr)"
                className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 outline-none text-sm transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* SUBMIT TLAČÍTKO */}
          <button
            type="submit"
            disabled={loading || !file}
            className="w-full py-4 mt-2 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-2xl shadow-xl shadow-indigo-600/25 hover:shadow-indigo-600/40 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Nahrávám zážitek...</span>
              </>
            ) : (
              <span>Publikovat zážitek 🚀</span>
            )}
          </button>
        </form>

      </div>
    </div>
  )
}