'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly')
  const [loading, setLoading] = useState(false)

  const benefits = [
    { icon: '👑', title: 'Ověřený VIP profil', description: 'Získej zlatou korunku u jména a odznak ověřeného páníčka.' },
    { icon: '👁️', title: 'Přehled návštěvníků', description: 'Zjisti, kdo si prohlížel tvůj profil nebo uložil fotky.' },
    { icon: '✨', title: 'Zcela bez reklam', description: 'Procházej aplikaci naprosto plynule a bez vyrušování.' },
    { icon: '🚀', title: 'Prioritní zviditelnění', description: 'Tvé příspěvky se zobrazí na předních příčkách přímo na Domů.' },
    { icon: '📋', title: 'Zdravotní deník', description: 'Hlídač termínů očkování, odčervení a kontrol u veterináře.' },
    { icon: '🏆', title: 'Výzvy s odměnou pro kámoše', description: 'Plň venčící výzvy a získej 1 měsíc Premium zdarma pro kamaráda!' },
    { icon: '🌤️', title: 'Hlídač počasí na venčení', description: 'Upozornění na ideální čas na procházku bez horka či deště.' },
  ]

  const handleCheckout = async () => {
    if (loading) return
    setLoading(true)

    try {
      // Tichá kontrola přihlášení na pozadí bez přesměrovávání
      const { data: { user } } = await supabase.auth.getUser()

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          userId: user?.id || null,
          email: user?.email || null,
        }),
      })

      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Chyba při načítání platby: ' + (data.error || 'Neznámá chyba'))
        setLoading(false)
      }
    } catch (error) {
      console.error('Chyba platby:', error)
      alert('Došlo k chybě při připojování k platební bráně.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col items-center justify-center p-4 md:p-8 antialiased">
      <div className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200/80 shadow-xl overflow-hidden">
        
        {/* Hlavička */}
        <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 p-8 text-center text-white relative">
          <Link
            href="/profile"
            className="absolute top-6 left-6 text-white/80 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl backdrop-blur-md transition"
            title="Zpět na profil"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          <span className="inline-block text-4xl mb-2 animate-bounce">👑</span>
          <h1 className="text-3xl font-extrabold tracking-tight">PawMeet Premium</h1>
          <p className="text-amber-100 text-sm mt-2 max-w-md mx-auto">
            Odemkni všechny výhody, plň výzvy a věnuj měsíc Premium svému parťákovi zdarma!
          </p>
        </div>

        <div className="p-6 md:p-8 space-y-8">
          
          {/* Výhody */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3.5 p-4 rounded-2xl bg-slate-50 border border-slate-100 ${
                  idx === benefits.length - 1 ? 'md:col-span-2 md:w-[calc(50%-0.5rem)] md:justify-self-center' : ''
                }`}
              >
                <span className="text-2xl shrink-0">{benefit.icon}</span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{benefit.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Ceník */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            
            {/* Měsíční plán */}
            <div
              onClick={() => setSelectedPlan('monthly')}
              className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                selectedPlan === 'monthly'
                  ? 'border-slate-900 bg-slate-900/5 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Měsíční plán</h4>
                <p className="text-xs text-slate-500 mt-1">Platba každý měsíc, bez závazků</p>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-900">99 Kč</span>
                <span className="text-xs text-slate-500"> / měsíc</span>
              </div>
            </div>

            {/* Roční plán */}
            <div
              onClick={() => setSelectedPlan('yearly')}
              className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all flex flex-col justify-between ${
                selectedPlan === 'yearly'
                  ? 'border-purple-600 bg-purple-500/5 shadow-sm'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <span className="absolute -top-3 right-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs">
                Ušetříš 24 %
              </span>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Roční plán</h4>
                <p className="text-xs text-slate-500 mt-1">Výhodné předplatné na celý rok</p>
              </div>
              <div className="mt-4">
                <span className="text-2xl font-black text-slate-900">899 Kč</span>
                <span className="text-xs text-slate-500"> / rok</span>
                <p className="text-[11px] font-semibold text-emerald-600 mt-1">
                  Vychází pouze na ~75 Kč / měsíc
                </p>
              </div>
            </div>

          </div>

          {/* Tlačítko akce */}
          <div className="space-y-3 pt-2">
            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:opacity-95 disabled:opacity-50 text-white font-bold py-3.5 px-6 rounded-2xl transition shadow-md active:scale-[0.99] flex items-center justify-center gap-2 text-sm cursor-pointer"
            >
              {loading ? (
                <span>Otevírám platební bránu...</span>
              ) : (
                <>
                  <span>Aktivovat PawMeet Premium</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Platba probíhá přes zabezpečenou bránu Stripe. Předplatné lze kdykoliv zrušit.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}