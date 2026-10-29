'use client'

import { FormEvent, useState } from 'react'
import Link from 'next/link'
import { Mail, Send, CheckCircle2, AlertCircle } from 'lucide-react'

export default function ContactPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{kind:'success'|'error';text:string}|null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setStatus(null)
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), message: message.trim() }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Zprávu se nepodařilo odeslat.')
      setStatus({ kind: 'success', text: 'Zpráva byla odeslána. Děkujeme, ozveme se na uvedený e-mail.' })
      setEmail('')
      setMessage('')
    } catch (error: any) {
      setStatus({ kind: 'error', text: error?.message || 'Zprávu se nepodařilo odeslat. Zkus to prosím později.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-10 pb-28 text-[var(--pm-forest)] sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[var(--pm-accent)] hover:underline">← Úvodní stránka</Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-[.85fr_1.15fr]">
        <section className="pt-3"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--pm-active)] text-[var(--pm-accent)]"><Mail size={23}/></div><h1 className="mt-5 text-4xl font-bold tracking-tight">Napiš nám.</h1><p className="mt-4 max-w-md text-sm leading-6 text-[var(--pm-muted)]">Máš dotaz, nápad na zlepšení nebo potřebuješ pomoct s účtem? Pošli nám zprávu. Kontaktní formulář odešle jen tvůj e-mail a text zprávy.</p><a href="mailto:pawmeet.eu@gmail.com" className="mt-5 inline-flex text-sm font-semibold text-[var(--pm-accent)] hover:underline">pawmeet.eu@gmail.com</a></section>
        <form onSubmit={submit} className="pawmeet-glass rounded-3xl p-6 sm:p-8">
          <label className="block text-sm font-semibold" htmlFor="contact-email">Tvůj e-mail</label><input id="contact-email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-page)] px-4 py-3 text-sm outline-none focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent)]/20" placeholder="jmeno@example.cz"/>
          <label className="mt-5 block text-sm font-semibold" htmlFor="contact-message">Zpráva</label><textarea id="contact-message" required minLength={3} maxLength={5000} rows={7} value={message} onChange={event=>setMessage(event.target.value)} className="mt-2 w-full resize-y rounded-xl border border-[var(--pm-line)] bg-[var(--pm-page)] px-4 py-3 text-sm outline-none focus:border-[var(--pm-accent)] focus:ring-2 focus:ring-[var(--pm-accent)]/20" placeholder="S čím ti můžeme pomoct?"/>
          {status && <p role={status.kind==='error'?'alert':'status'} className={'mt-4 flex items-start gap-2 rounded-xl p-3 text-sm '+(status.kind==='error'?'bg-rose-50 text-rose-800':'bg-[var(--pm-active)] text-[var(--pm-forest)]')}>{status.kind==='error'?<AlertCircle size={17}/>:<CheckCircle2 size={17}/>}<span>{status.text}</span></p>}
          <button type="submit" disabled={busy || !email.trim() || !message.trim()} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[var(--pm-accent)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50">{busy?'Odesílám…':<>Odeslat zprávu <Send size={16}/></>}</button>
          <p className="mt-3 text-xs leading-5 text-[var(--pm-muted)]">Neposílej sem hesla ani jiné citlivé údaje. Pokud kontaktní služba není nakonfigurovaná, zobrazí se upozornění a můžeš použít e-mailový odkaz.</p>
        </form>
      </div>
    </main>
  )
}
