'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { WifiOff, RefreshCw } from 'lucide-react'

export default function OfflinePage() {
  const [online, setOnline] = useState(false)
  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  return (
    <main className="flex min-h-[70vh] items-center justify-center px-5 py-12">
      <section className="pawmeet-glass w-full max-w-lg rounded-3xl p-7 text-center sm:p-10">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--pm-active)] text-[var(--pm-accent)]">
          {online ? <RefreshCw size={25} aria-hidden="true" /> : <WifiOff size={25} aria-hidden="true" />}
        </div>
        <h1 className="mt-5 text-2xl font-bold text-[var(--pm-forest)]">{online ? 'Připojení je zpět' : 'Jsi offline'}</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--pm-muted)]">
          {online
            ? 'Připojení se obnovilo. Zkus znovu otevřít požadovanou stránku.'
            : 'Tahle stránka není dostupná bez připojení. Z bezpečnostních důvodů PawMeet offline neukládá soukromé zprávy ani chráněné stránky.'}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--pm-accent)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90">
            <RefreshCw size={16} aria-hidden="true" /> Zkusit znovu
          </button>
          <Link href="/" className="inline-flex items-center justify-center rounded-xl border border-[var(--pm-line)] px-5 py-3 text-sm font-semibold text-[var(--pm-forest)] hover:bg-[var(--pm-hover)]">
            Veřejná úvodní stránka
          </Link>
        </div>
      </section>
    </main>
  )
}
