'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Search, UsersRound, Dog, CalendarDays, Image as ImageIcon, MapPin, GraduationCap, Users, ChevronRight, SlidersHorizontal } from 'lucide-react'

type Category = 'all' | 'people' | 'dogs' | 'events' | 'posts' | 'places' | 'services' | 'groups'
type Result = { id: string; kind: Exclude<Category, 'all'>; title: string; description: string; href: string; avatar?: string; createdAt?: string }

const categories: { id: Category; label: string }[] = [
  { id: 'all', label: 'Všechno' },
  { id: 'people', label: 'Pejskaři' },
  { id: 'dogs', label: 'Psi a plemena' },
  { id: 'events', label: 'Akce' },
  { id: 'posts', label: 'Příspěvky' },
  { id: 'places', label: 'Místa' },
  { id: 'services', label: 'Služby' },
  { id: 'groups', label: 'Komunity' },
]

const icons = {
  people: UsersRound,
  dogs: Dog,
  events: CalendarDays,
  posts: ImageIcon,
  places: MapPin,
  services: GraduationCap,
  groups: Users,
}

export default function SearchPage() {
  const [category, setCategory] = useState<Category>('all')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Result[]>([])
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const initialQuery = params.get('q')
    if (initialQuery) setQuery(initialQuery)
    if (params.get('scope') === 'all') setCategory('all')
    createClient().auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id || null))
  }, [])

  useEffect(() => {
    let cancelled = false
    const search = async () => {
      setLoading(true)
      setErrorMessage('')
      const supabase = createClient()
      const term = query.trim().slice(0, 120)
      const like = '%' + term.replace(/[%_,]/g, ' ') + '%'
      const applyTextFilter = (request: any, columns: string[]) => term ? request.or(columns.map(column => column + '.ilike.' + like).join(',')) : request
      try {
        let found: Result[] = []

        if (category === 'all' || category === 'people') {
          const request = applyTextFilter(
            supabase.from('profiles').select('id, username, first_name, display_name, full_name, avatar_url, bio, role, visibility').limit(category === 'all' ? 12 : 100),
            ['username', 'first_name', 'display_name', 'full_name', 'bio', 'role']
          )
          const { data, error } = await request
          if (error) throw error
          found.push(...(data || []).filter((p: any) => p.id !== currentUserId).map((p: any) => ({
            id: p.id, kind: 'people' as const,
            title: p.display_name || p.full_name || p.first_name || (p.username && !p.username.startsWith('user_') ? p.username : 'Pejskař'),
            description: [p.username && !p.username.startsWith('user_') ? '@' + p.username : '', p.role, p.bio].filter(Boolean).join(' · ') || 'Profil pejskaře',
            href: '/profile/' + (p.username || p.id), avatar: p.avatar_url || '',
          })))
        }

        if (category === 'all' || category === 'dogs') {
          const request = applyTextFilter(
            supabase.from('pets').select('id, user_id, name, type, breed, size, nature, activities').limit(category === 'all' ? 12 : 100),
            ['name', 'type', 'breed', 'nature', 'activities']
          )
          const { data, error } = await request
          if (error) throw error
          found.push(...(data || []).map((p: any) => ({
            id: p.id, kind: 'dogs' as const, title: p.name || 'Pes bez jména',
            description: [p.breed || p.type, p.size, p.activities].filter(Boolean).join(' · ') || 'Psí profil',
            href: '/dogs/' + p.id,
          })))
        }

        if (category === 'all' || category === 'events' || category === 'places') {
          const request = applyTextFilter(
            supabase.from('events').select('id, title, description, starts_at, location, event_type, status').eq('status', 'published').limit(category === 'all' ? 12 : 100),
            category === 'places' ? ['location'] : ['title', 'description', 'location', 'event_type']
          )
          const { data, error } = await request
          if (error) throw error
          if (category === 'places') {
            const unique = new Map<string, any>()
            ;(data || []).filter((event: any) => event.location).forEach((event: any) => unique.set(event.location, event))
            found.push(...Array.from(unique.values()).map((event: any) => ({
              id: event.id, kind: 'places' as const, title: event.location,
              description: 'Lokalita veřejné akce · ' + (event.title || 'Akce'),
              href: '/map',
            })))
          } else {
            found.push(...(data || []).map((event: any) => ({
              id: event.id, kind: 'events' as const, title: event.title || 'Akce',
              description: [event.event_type, event.location, event.starts_at ? new Date(event.starts_at).toLocaleString('cs-CZ') : ''].filter(Boolean).join(' · '),
              href: '/calendar',
              createdAt: event.starts_at || '',
            })))
          }
        }

        if (category === 'all' || category === 'posts') {
          const request = applyTextFilter(
            supabase.from('posts').select('id, caption, location, media_type, created_at').limit(category === 'all' ? 12 : 100),
            ['caption', 'location']
          )
          const { data, error } = await request
          if (error) throw error
          found.push(...(data || []).map((post: any) => ({
            id: post.id, kind: 'posts' as const,
            title: post.caption || (post.media_type === 'video' ? 'Video / Reel' : 'Příspěvek'),
            description: [post.location, post.created_at ? new Date(post.created_at).toLocaleDateString('cs-CZ') : ''].filter(Boolean).join(' · ') || 'Příspěvek komunity',
            href: '/domu#post-' + post.id, createdAt: post.created_at || '',
          })))
        }

        if (category === 'all' || category === 'services') {
          const request = applyTextFilter(
            supabase.from('trainer_lesson_offers').select('id, trainer_id, title, description, duration_minutes, price_minor, currency').eq('is_active', true).limit(category === 'all' ? 12 : 100),
            ['title', 'description']
          )
          const { data, error } = await request
          if (error) throw error
          found.push(...(data || []).map((offer: any) => ({
            id: offer.id, kind: 'services' as const, title: offer.title || 'Tréninková služba',
            description: [offer.description, offer.duration_minutes ? offer.duration_minutes + ' min' : '', Number.isFinite(offer.price_minor) ? (offer.price_minor / 100).toLocaleString('cs-CZ', { style: 'currency', currency: offer.currency || 'CZK' }) : ''].filter(Boolean).join(' · '),
            href: '/trainer/offers',
          })))
        }

        if (category === 'all' || category === 'groups') {
          const request = applyTextFilter(
            supabase.from('groups').select('id, name, avatar_url, is_private, is_public').limit(category === 'all' ? 12 : 100),
            ['name']
          )
          const { data, error } = await request
          if (error) throw error
          found.push(...(data || []).map((group: any) => ({
            id: group.id, kind: 'groups' as const, title: group.name || 'Komunita',
            description: group.is_private ? 'Soukromá komunita' : 'Veřejná komunita',
            href: '/communities', avatar: group.avatar_url || '',
          })))
        }

        if (!cancelled) {
          if (category === 'all' && term) {
            const normalized = term.toLocaleLowerCase('cs-CZ')
            found.sort((a, b) => Number(b.title.toLocaleLowerCase('cs-CZ').startsWith(normalized)) - Number(a.title.toLocaleLowerCase('cs-CZ').startsWith(normalized)))
          }
          setResults(found)
        }
      } catch (error: any) {
        if (!cancelled) {
          setResults([])
          setErrorMessage(error?.message || 'Hledání se nepodařilo dokončit.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void search()
    return () => { cancelled = true }
  }, [category, query, currentUserId])

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-7 pb-28 text-[var(--pm-forest)] md:px-8 md:py-10">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]"><Search size={15} aria-hidden="true" /> Objevuj PawMeet</div>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Hledání napříč PawMeet</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Najdi pejskaře, psí parťáky, akce, příspěvky, komunity a tréninkové služby.</p>
      <label className="relative mt-6 block">
        <span className="sr-only">Co chceš najít?</span>
        <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--pm-muted)]" />
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Jméno, plemeno, akce, služba nebo klíčové slovo…" className="w-full rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] py-4 pl-11 pr-4 text-sm text-[var(--pm-forest)] shadow-sm outline-none transition focus:border-[var(--pm-green)] focus:ring-2 focus:ring-[var(--pm-green)]/20" />
      </label>
      <div className="mt-4 flex items-center gap-2 text-xs text-[var(--pm-muted)]"><SlidersHorizontal size={14} aria-hidden="true" /> Vyber oblast, kterou chceš prohledat.</div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="Kategorie hledání">
        {categories.map(item => <button key={item.id} role="tab" aria-selected={category === item.id} onClick={() => setCategory(item.id)} className={'shrink-0 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ' + (category === item.id ? 'border-[var(--pm-green)] bg-[var(--pm-green)] text-white' : 'border-[var(--pm-line)] bg-[var(--pm-card)] text-[var(--pm-forest)] hover:bg-[var(--pm-hover)]')}>{item.label}</button>)}
      </div>
      <div className="mt-5 flex items-center justify-between"><h2 className="text-sm font-bold">{categories.find(item => item.id === category)?.label}</h2><span className="text-xs text-[var(--pm-muted)]">{loading ? 'Hledám…' : results.length + ' výsledků'}</span></div>
      {errorMessage && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">Hledání se nepodařilo: {errorMessage}</p>}
      {loading ? <div className="mt-6 grid gap-3 md:grid-cols-2">{[1,2,3,4].map(n => <div key={n} className="h-20 animate-pulse rounded-2xl bg-[var(--pm-hover)]" />)}</div> : results.length ? <div className="mt-4 grid gap-3 md:grid-cols-2">{results.map(item => {
        const Icon = icons[item.kind]
        return <Link key={item.kind + '-' + item.id} href={item.href} className="pawmeet-glass group flex min-w-0 items-center gap-3 rounded-2xl p-4 transition hover:-translate-y-0.5 hover:shadow-md">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-hover)] text-[var(--pm-forest)]">{item.avatar ? <img src={item.avatar} alt="" className="h-full w-full object-cover" /> : <Icon size={21} strokeWidth={1.8} aria-hidden="true" />}</div>
          <div className="min-w-0 flex-1"><h3 className="truncate text-sm font-bold group-hover:underline">{item.title}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--pm-muted)]">{item.description}</p></div><ChevronRight size={17} className="shrink-0 text-[var(--pm-muted)]" aria-hidden="true" />
        </Link>
      })}</div> : <div className="pawmeet-glass mt-5 rounded-2xl px-5 py-12 text-center"><Search size={28} className="mx-auto text-[var(--pm-muted)]" aria-hidden="true" /><p className="mt-3 text-sm font-bold">Nic jsme nenašli</p><p className="mt-1 text-xs text-[var(--pm-muted)]">Zkus jiný výraz nebo kategorii. Zobrazují se jen údaje, ke kterým máš přístup.</p></div>}
    </main>
  )
}
