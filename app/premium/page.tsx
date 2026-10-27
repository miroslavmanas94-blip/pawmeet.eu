'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        window.location.href = '/login?redirectTo=%2Fpremium'
        return
      }
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Platbu se nepodařilo připravit.')
      window.location.href = data.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nastala chyba při platbě.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f5ec] px-4 py-10 text-[#183d2c] md:px-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] border border-[#dce6d8] bg-white/85 shadow-xl shadow-[#234a3410] backdrop-blur-xl">
        <header className="bg-gradient-to-br from-[#194a34] to-[#4c7d59] p-8 text-center text-white md:p-12">
          <Link href="/profile" className="float-left rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/20">← Zpět</Link>
          <p className="mb-3 text-xs font-bold uppercase tracking-[.22em] text-[#e3e9c8]">Mega haf</p>
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">PawMeet Premium</h1>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-white/80">Více prostoru pro tvůj psí svět. Přehledné funkce, žádné zbytečné rušení.</p>
        </header>
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_1fr] md:p-10">
          <section>
            <h2 className="text-xl font-bold">Co získáš</h2>
            <ul className="mt-5 space-y-4 text-sm leading-6 text-slate-700">
              {['Zážitek bez reklam','Rozšířené profily a přehledy','Pokročilé statistiky a historie aktivit','Prémiové možnosti přizpůsobení profilu','Přednostní přístup k novým funkcím'].map((item) => <li key={item} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#e8f0e3] text-[#2d6846]">✓</span><span>{item}</span></li>)}
            </ul>
          </section>
          <section className="rounded-3xl border border-[#dce6d8] bg-[#f8faf5] p-5 md:p-6">
            <h2 className="text-lg font-bold">Vyber si předplatné</h2>
            <button onClick={() => setSelectedPlan('monthly')} className={`mt-4 flex w-full items-center justify-between rounded-2xl border p-4 text-left ${selectedPlan === 'monthly' ? 'border-[#2d6846] bg-white ring-2 ring-[#2d6846]/15' : 'border-slate-200 bg-white/60'}`}>
              <span><span className="block font-semibold">Měsíční</span><span className="text-xs text-slate-500">Platba každý měsíc</span></span><span className="text-right"><strong className="text-2xl">49 Kč</strong><span className="block text-xs text-slate-500"> / měsíc</span></span>
            </button>
            <button onClick={() => setSelectedPlan('yearly')} className={`mt-3 flex w-full items-center justify-between rounded-2xl border p-4 text-left ${selectedPlan === 'yearly' ? 'border-[#2d6846] bg-white ring-2 ring-[#2d6846]/15' : 'border-slate-200 bg-white/60'}`}>
              <span><span className="block font-semibold">Roční <span className="ml-1 rounded-full bg-[#e8f0e3] px-2 py-1 text-[10px] text-[#2d6846]">Výhodnější</span></span><span className="text-xs text-slate-500">Platba jednou ročně</span></span><span className="text-right"><strong className="text-2xl">449 Kč</strong><span className="block text-xs text-slate-500"> / rok</span></span>
            </button>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
            <button disabled={loading} onClick={handleCheckout} className="mt-5 w-full rounded-2xl bg-[#24563b] px-5 py-4 font-bold text-white transition hover:bg-[#183d2c] disabled:cursor-wait disabled:opacity-60">{loading ? 'Připravuji bezpečnou platbu…' : 'Pokračovat k bezpečné platbě'}</button>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">Platba probíhá přes Stripe. Předplatné se řídí podmínkami zobrazenými při platbě.</p>
          </section>
        </div>
      </div>
    </div>
  )
}
