'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ArrowRight } from 'lucide-react'

export default function HomeSearch() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = query.trim()
    router.push(value ? '/search?q=' + encodeURIComponent(value) + '&scope=all' : '/search?scope=all')
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      aria-label="Vyhledávání napříč PawMeet"
      className="pawmeet-glass mx-2 flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-white/60 bg-white/45 p-1.5 shadow-[0_8px_28px_rgba(24,53,46,0.09)] backdrop-blur-xl sm:mx-5 sm:max-w-xl"
    >
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Hledat pejskaře, psy, příspěvky, události, místa, služby a komunity</span>
        <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pm-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Hledat pejskaře, psy, příspěvky, místa…"
          className="w-full rounded-xl border border-white/55 bg-white/35 py-2.5 pl-10 pr-3 text-sm text-[var(--pm-forest)] placeholder:text-[var(--pm-muted)]/90 outline-none backdrop-blur-md transition focus:border-[var(--pm-green)]/50 focus:bg-white/65 focus:ring-2 focus:ring-[var(--pm-green)]/15"
        />
      </label>
      <button
        type="submit"
        aria-label="Spustit hledání ve všech kategoriích"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--pm-green)]/90 text-white shadow-sm backdrop-blur transition hover:bg-[var(--pm-green)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </form>
  )
}
