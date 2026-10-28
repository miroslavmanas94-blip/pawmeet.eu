'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, Dog, Plus, CalendarDays, PawPrint, Ruler, Activity } from 'lucide-react'

type Pet = {
  id: string
  name: string
  breed: string | null
  birth_date: string | null
  gender: string | null
  size: string | null
  nature: string | null
  activities: string | null
  created_at: string
}

export default function MyDogsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [pets, setPets] = useState<Pet[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState('')
  const [size, setSize] = useState('')
  const [nature, setNature] = useState('')
  const [activities, setActivities] = useState('')

  const loadPets = async () => {
    setLoading(true)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      router.replace('/login?next=%2Fprofile%2Fdogs')
      return
    }
    const { data, error: petsError } = await supabase
      .from('pets')
      .select('id,name,breed,birth_date,gender,size,nature,activities,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    if (petsError) setError('Psy se nepodařilo načíst. Zkontroluj připojení a přístup ke svému profilu.')
    else setPets((data || []) as Pet[])
    setLoading(false)
  }

  useEffect(() => { void loadPets() }, [])

  const addPet = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    if (!name.trim()) { setError('Vyplň jméno psa.'); return }
    setSaving(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) throw new Error('Nejdřív se přihlas.')
      const { error: insertError } = await supabase.from('pets').insert({
        user_id: user.id,
        name: name.trim(),
        breed: breed.trim() || null,
        birth_date: birthDate || null,
        gender: gender || null,
        size: size || null,
        nature: nature.trim() || null,
        activities: activities.trim() || null,
      })
      if (insertError) throw insertError
      setName(''); setBreed(''); setBirthDate(''); setGender(''); setSize(''); setNature(''); setActivities('')
      setShowForm(false)
      await loadPets()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Psa se nepodařilo uložit.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-7 text-[var(--pm-forest)] sm:px-6 lg:px-8">
    <Link href="/profile" className="inline-flex items-center gap-2 rounded-xl py-2 text-sm font-semibold text-[var(--pm-muted)] hover:text-[var(--pm-forest)]"><ArrowLeft size={17}/> Zpět na profil</Link>
    <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[.2em] text-[var(--pm-muted)]">Můj profil</p><h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Moji psi</h1><p className="mt-2 max-w-xl text-sm leading-6 text-[var(--pm-muted)]">Měj údaje o svých parťácích přehledně na jednom místě. Záznamy se ukládají k tvému účtu.</p></div>
      <button onClick={() => setShowForm(v => !v)} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#286747] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#1d5438]"><Plus size={18}/>{showForm ? 'Zavřít formulář' : 'Přidat psa'}</button>
    </div>

    {error && <p role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}

    {showForm && <form onSubmit={addPet} className="pawmeet-glass mt-6 grid gap-4 rounded-3xl p-5 sm:grid-cols-2 sm:p-6">
      <div className="sm:col-span-2"><h2 className="text-lg font-extrabold">Nový psí profil</h2><p className="mt-1 text-xs text-[var(--pm-muted)]">Jméno je povinné. Ostatní údaje můžeš doplnit později.</p></div>
      <label className="text-xs font-bold">Jméno psa *<input required maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder="Např. Monty" className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-600/30"/></label>
      <label className="text-xs font-bold">Plemeno<input maxLength={100} value={breed} onChange={e=>setBreed(e.target.value)} placeholder="Např. shetlandský ovčák" className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-600/30"/></label>
      <label className="text-xs font-bold">Datum narození<input type="date" value={birthDate} onChange={e=>setBirthDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-600/30"/></label>
      <label className="text-xs font-bold">Pohlaví<select value={gender} onChange={e=>setGender(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-600/30"><option value="">Nevyplněno</option><option value="male">Pes</option><option value="female">Fena</option></select></label>
      <label className="text-xs font-bold">Velikost<select value={size} onChange={e=>setSize(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-600/30"><option value="">Nevyplněno</option><option value="small">Malý</option><option value="medium">Střední</option><option value="large">Velký</option></select></label>
      <label className="text-xs font-bold">Povaha<input maxLength={500} value={nature} onChange={e=>setNature(e.target.value)} placeholder="Jaký je tvůj pes?" className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-600/30"/></label>
      <label className="text-xs font-bold sm:col-span-2">Aktivity a sporty<input maxLength={500} value={activities} onChange={e=>setActivities(e.target.value)} placeholder="Agility, Dog Puller, výlety…" className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm font-normal outline-none focus:ring-2 focus:ring-emerald-600/30"/></label>
      <div className="flex flex-wrap justify-end gap-2 sm:col-span-2"><button type="button" onClick={()=>setShowForm(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[var(--pm-muted)]">Zrušit</button><button disabled={saving} className="rounded-xl bg-[#286747] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Ukládám…' : 'Uložit psa'}</button></div>
    </form>}

    {loading ? <div className="mt-8 rounded-3xl border border-[var(--pm-line)] bg-[var(--pm-glass)] p-8 text-sm text-[var(--pm-muted)]">Načítám psí profily…</div> : pets.length === 0 ? <div className="pawmeet-glass mt-7 flex flex-col items-center rounded-3xl px-6 py-14 text-center"><span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[var(--pm-active)] text-[var(--pm-forest)]"><Dog size={30}/></span><h2 className="mt-4 text-xl font-extrabold">Začni profilem svého psa</h2><p className="mt-2 max-w-md text-sm leading-6 text-[var(--pm-muted)]">Přidej jméno a základní údaje. Později můžeš navázat tréninkové záznamy a sledovat pokrok.</p><button onClick={()=>setShowForm(true)} className="mt-5 rounded-xl bg-[#286747] px-5 py-3 text-sm font-bold text-white">Přidat prvního psa</button></div> : <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{pets.map(pet=><article key={pet.id} className="pawmeet-glass rounded-3xl p-5"><div className="flex items-start justify-between gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--pm-active)] text-[var(--pm-forest)]"><PawPrint size={24}/></span><span className="rounded-full border border-[var(--pm-line)] px-2.5 py-1 text-[10px] font-bold text-[var(--pm-muted)]">{pet.gender==='female'?'Fena':pet.gender==='male'?'Pes':'Pes'}</span></div><h2 className="mt-4 text-xl font-extrabold">{pet.name}</h2><p className="mt-1 text-sm text-[var(--pm-muted)]">{pet.breed || 'Plemeno zatím nevyplněno'}</p><div className="mt-4 space-y-2 border-t border-[var(--pm-line)] pt-4 text-xs text-[var(--pm-muted)]">{pet.birth_date && <p className="flex items-center gap-2"><CalendarDays size={14}/>{new Date(pet.birth_date+'T12:00:00').toLocaleDateString('cs-CZ')}</p>}{pet.size && <p className="flex items-center gap-2"><Ruler size={14}/>{pet.size==='small'?'Malý':pet.size==='medium'?'Střední':pet.size==='large'?'Velký':pet.size}</p>}{pet.activities && <p className="flex items-center gap-2"><Activity size={14}/>{pet.activities}</p>}{pet.nature && <p className="leading-5">{pet.nature}</p>}</div><Link href="/training" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-[var(--pm-line)] px-3 py-2 text-xs font-bold text-[var(--pm-forest)] hover:bg-[var(--pm-hover)]">Otevřít trénink</Link></article>)}</div>}
  </main>
}
