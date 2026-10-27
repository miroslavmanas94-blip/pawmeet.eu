'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Category = 'people' | 'dogs' | 'events' | 'posts' | 'places'
type Result = { id: string; kind: Category; title: string; description: string; href: string; avatar?: string }

const categories: { id: Category; label: string }[] = [
  { id: 'people', label: 'Pejskaři a trenéři' },
  { id: 'dogs', label: 'Psi a profily' },
  { id: 'events', label: 'Akce a tréninky' },
  { id: 'posts', label: 'Příspěvky a příběhy' },
  { id: 'places', label: 'Místa a psí parky' }
]

export default function SearchPage() {
  const [category, setCategory] = useState<Category>('people')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
  }, [])

  useEffect(() => {
    let cancelled = false
    const search = async () => {
      setLoading(true)
      setErrorMessage('')
      const supabase = createClient()
      const term = query.trim()
      const like = '%' + term.replace(/[%_,]/g, ' ') + '%'
      try {
        let found: Result[] = []
        if (category === 'people') {
          let request = supabase.from('profiles').select('id, username, first_name, display_name, full_name, avatar_url, bio, role').limit(100)
          if (term) request = request.or('username.ilike.' + like + ',first_name.ilike.' + like + ',display_name.ilike.' + like + ',full_name.ilike.' + like + ',bio.ilike.' + like + ',role.ilike.' + like)
          const { data, error } = await request
          if (error) throw error
          found = (data || []).filter((p: any) => p.id !== currentUserId).map((p: any) => ({
            id: p.id, kind: 'people', title: p.display_name || p.full_name || p.first_name || (p.username && !p.username.startsWith('user_') ? p.username : 'Pejskař'),
            description: [p.username && !p.username.startsWith('user_') ? '@' + p.username : '', p.role, p.bio].filter(Boolean).join(' · '),
            href: '/profile/' + (p.username || p.id), avatar: p.avatar_url || ''
          }))
        } else if (category === 'dogs') {
          let request = supabase.from('pets').select('id, user_id, name, type, breed, size, nature, activities').limit(100)
          if (term) request = request.or('name.ilike.' + like + ',type.ilike.' + like + ',breed.ilike.' + like + ',nature.ilike.' + like + ',activities.ilike.' + like)
          const { data, error } = await request
          if (error) throw error
          found = (data || []).map((p: any) => ({ id: p.id, kind: 'dogs', title: p.name || 'Pes bez jména', description: [p.breed, p.size, p.activities].filter(Boolean).join(' · ') || 'Psí profil', href: '/profile' }))
        } else if (category === 'events') {
          let request = supabase.from('events').select('id, title, description, starts_at, location, event_type, status').limit(100)
          if (term) request = request.or('title.ilike.' + like + ',description.ilike.' + like + ',location.ilike.' + like + ',event_type.ilike.' + like)
          const { data, error } = await request
          if (error) throw error
          found = (data || []).map((e: any) => ({ id: e.id, kind: 'events', title: e.title || 'Akce', description: [e.event_type, e.location, e.starts_at ? new Date(e.starts_at).toLocaleString('cs-CZ') : ''].filter(Boolean).join(' · '), href: '/calendar' }))
        } else if (category === 'posts') {
          let postRequest = supabase.from('posts').select('id, caption, location, media_type, created_at').limit(100)
          let storyRequest = supabase.from('stories').select('id, pet_tag, overlay_text, text_overlay, media_type, created_at').limit(100)
          if (term) {
            postRequest = postRequest.or('caption.ilike.' + like + ',location.ilike.' + like)
            storyRequest = storyRequest.or('pet_tag.ilike.' + like + ',overlay_text.ilike.' + like + ',text_overlay.ilike.' + like)
          }
          const [posts, stories] = await Promise.all([postRequest, storyRequest])
          if (posts.error) throw posts.error
          if (stories.error) throw stories.error
          found = [
            ...(posts.data || []).map((p: any) => ({ id: p.id, kind: 'posts' as Category, title: p.caption || (p.media_type === 'video' ? 'Video / Reel' : 'Příspěvek'), description: [p.location, p.created_at ? new Date(p.created_at).toLocaleDateString('cs-CZ') : ''].filter(Boolean).join(' · '), href: '/domu#post-' + p.id })),
            ...(stories.data || []).map((p: any) => ({ id: 'story-' + p.id, kind: 'posts' as Category, title: p.text_overlay || p.overlay_text || p.pet_tag || 'Příběh', description: 'Příběh · ' + (p.media_type || 'média'), href: '/domu' }))
          ]
        } else {
          let request = supabase.from('user_locations').select('user_id, address, is_active, updated_at').eq('is_active', true).limit(100)
          if (term) request = request.ilike('address', like)
          const { data, error } = await request
          if (error) throw error
          found = (data || []).filter((p: any) => p.address).map((p: any) => ({ id: p.user_id, kind: 'places', title: p.address, description: 'Místo sdílené pejskařem', href: '/map' }))
        }
        if (!cancelled) setResults(found)
      } catch (error: any) {
        if (!cancelled) { setResults([]); setErrorMessage(error?.message || 'Hledání se nepodařilo dokončit.') }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void search()
    return () => { cancelled = true }
  }, [category, query, currentUserId])

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-7 pb-28 text-[#183d2c] md:px-8 md:py-10">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#66816a]">Objevuj PawMeet</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-[#174b35] md:text-4xl">Hledání napříč PawMeet</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Najdi pejskaře, psí parťáky, akce, příspěvky i místa, která sdílí komunita.</p>
      <label className="mt-6 block">
        <span className="sr-only">Co chceš najít?</span>
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Zadej jméno, plemeno, akci, místo nebo klíčové slovo…" className="w-full rounded-2xl border border-[#d4e3cf] bg-white/85 px-4 py-4 text-sm text-[#183d2c] shadow-sm outline-none transition focus:border-[#6d9b72] focus:ring-2 focus:ring-[#6d9b72]/20" />
      </label>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Kategorie hledání">
        {categories.map(item => <button key={item.id} role="tab" aria-selected={category === item.id} onClick={() => setCategory(item.id)} className={'shrink-0 rounded-xl border px-3 py-2.5 text-xs font-bold transition ' + (category === item.id ? 'border-[#24563b] bg-[#24563b] text-white shadow-sm' : 'border-[#d4e3cf] bg-white/75 text-[#24563b] hover:bg-[#e8f0e3]')}>{item.label}</button>)}
      </div>
      <div className="mt-5 flex items-center justify-between"><h2 className="text-sm font-extrabold text-[#174b35]">{categories.find(item => item.id === category)?.label}</h2><span className="text-xs text-slate-500">{loading ? 'Hledám…' : results.length + ' výsledků'}</span></div>
      {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Hledání se nepodařilo: {errorMessage}</p>}
      {loading ? <div className="mt-6 grid gap-3 md:grid-cols-2">{[1,2,3,4].map(n => <div key={n} className="h-20 animate-pulse rounded-2xl bg-[#e8f0e3]" />)}</div> : results.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{results.map(item => <Link key={item.kind + '-' + item.id} href={item.href} className="pawmeet-glass group flex min-w-0 items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#dce6d8] bg-[#e8f0e3] text-xl">{item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : item.kind === 'dogs' ? '🐾' : item.kind === 'events' ? '◷' : item.kind === 'places' ? '⌖' : item.kind === 'posts' ? '▧' : '○'}</div>
        <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-extrabold text-[#174b35] group-hover:underline">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{item.description}</p></div><span className="text-xs font-bold text-[#477353]">Otevřít →</span>
      </Link>)}</div> : <div className="pawmeet-glass mt-5 rounded-2xl px-5 py-12 text-center"><div className="text-3xl">⌕</div><p className="mt-3 text-sm font-bold text-[#174b35]">Nic jsme nenašli</p><p className="mt-1 text-xs text-slate-500">Zkus jiný výraz nebo kategorii.</p></div>}
    </main>
  )
}
