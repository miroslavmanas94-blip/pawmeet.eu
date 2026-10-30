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
    <form onSubmit={submit} role="search" className="mx-2 flex min-w-0 flex-1 items-center gap-2 sm:mx-5 sm:max-w-xl">
      <label className="relative block min-w-0 flex-1">
        <span className="sr-only">Hledat na PawMeet</span>
        <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pm-muted)]" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Najdi pejskaře, psy, akce…"
          className="w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-page)] py-2.5 pl-10 pr-3 text-sm text-[var(--pm-forest)] placeholder:text-[var(--pm-muted)] focus:border-[var(--pm-green)] focus:bg-[var(--pm-card)] focus:outline-none focus:ring-2 focus:ring-[var(--pm-green)]/15"
        />
      </label>
      <button
        type="submit"
        aria-label="Spustit hledání"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--pm-green)] text-white transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </form>
  )
}
