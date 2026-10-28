'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Trainer = { id: string; username: string | null; display_name: string | null; full_name: string | null; avatar_url: string | null; bio: string | null }
type Reservation = { id: string; student_id: string; trainer_id: string; title: string; description: string | null; starts_at: string; ends_at: string | null; price_minor: number; currency: string; status: string; created_at: string }

const supabase = createClient()
const money = (minor: number, currency: string) => new Intl.NumberFormat('cs-CZ', { style: 'currency', currency }).format(minor / 100)
const statusLabel: Record<string, string> = { pending: 'Čeká na potvrzení', confirmed: 'Potvrzeno', cancelled: 'Zrušeno', completed: 'Dokončeno', payment_pending: 'Čeká na platbu', paid: 'Zaplaceno', refunded: 'Vráceno' }

export default function ReservationsPage() {
  const [userId, setUserId] = useState('')
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [trainerNames, setTrainerNames] = useState<Record<string, string>>({})
  const [trainerId, setTrainerId] = useState('')
  const [title, setTitle] = useState('Individuální lekce')
  const [description, setDescription] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [duration, setDuration] = useState('60')
  const [price, setPrice] = useState('0')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) { setNotice('Pro rezervaci lekce se nejdřív přihlas.'); return }
      setUserId(user.id)
      const [{ data: trainerRows, error: trainerError }, { data: reservationRows, error: reservationError }] = await Promise.all([
        supabase.from('profiles').select('id,username,display_name,full_name,avatar_url,bio').in('role', ['trainer', 'Trainer', 'trenér', 'Trenér', 'trainer_verified']).order('display_name'),
        supabase.from('reservations').select('*').or(`student_id.eq.${user.id},trainer_id.eq.${user.id}`).order('starts_at', { ascending: false }).limit(100)
      ])
      if (trainerError) throw trainerError
      if (reservationError) throw reservationError
      const safeTrainers = (trainerRows || []).filter((t: Trainer) => t.id !== user.id)
      setTrainers(safeTrainers)
      setTrainerNames(Object.fromEntries(safeTrainers.map((t: Trainer) => [t.id, t.display_name || t.full_name || t.username || 'Trenér'])))
      setReservations((reservationRows || []) as Reservation[])
      if (!trainerId && safeTrainers[0]) setTrainerId(safeTrainers[0].id)
    } catch (error) {
      console.error('Načtení rezervací selhalo:', error)
      setNotice('Rezervace se nepodařilo načíst. Zkus stránku obnovit.')
    } finally { setLoading(false) }
  }

  useEffect(() => { void load() }, [])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setNotice('')
    if (!userId) { setNotice('Pro vytvoření rezervace se přihlas.'); return }
    const start = new Date(startsAt)
    const minutes = Number(duration)
    const amount = Math.round(Number(price) * 100)
    if (!trainerId || !Number.isFinite(start.getTime()) || start.getTime() <= Date.now() || !Number.isFinite(minutes) || minutes < 15 || minutes > 240 || !Number.isFinite(amount) || amount < 0) {
      setNotice('Zkontroluj trenéra, budoucí termín, délku 15–240 minut a cenu.')
      return
    }
    setSaving(true)
    try {
      const end = new Date(start.getTime() + minutes * 60_000)
      const { error } = await supabase.from('reservations').insert({
        student_id: userId,
        trainer_id: trainerId,
        title: title.trim() || 'Individuální lekce',
        description: description.trim() || null,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        price_minor: amount,
        currency: 'CZK',
        status: amount > 0 ? 'payment_pending' : 'pending'
      })
      if (error) throw error
      setNotice(amount > 0
        ? 'Žádost o placenou lekci byla vytvořena. Online platba zatím není připojena, takže se nic nestrhlo.'
        : 'Žádost o bezplatnou lekci byla odeslána trenérovi.')
      setDescription('')
      setStartsAt('')
      await load()
    } catch (error) {
      console.error('Vytvoření rezervace selhalo:', error)
      setNotice('Rezervaci se nepodařilo vytvořit. Zkontroluj přihlášení a zkus to znovu.')
    } finally { setSaving(false) }
  }

  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
    <Link href="/profile" className="text-sm font-semibold text-[var(--pm-green)] hover:underline">← Zpět na profil</Link>
    <header className="mt-6 max-w-2xl">
      <p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">PawMeet · Trénink</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Rezervace lekcí</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--pm-muted)]">Požádej o termín u trenéra. Bezplatné lekce čekají na potvrzení; placené lekce zatím evidují cenu a žádost, online platba není aktivní.</p>
    </header>

    {notice && <p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm">{notice}</p>}

    {!loading && userId && <section className="mt-6 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5 md:p-6">
      <h2 className="text-lg font-semibold">Požádat o lekci</h2>
      <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Trenér
          <select required value={trainerId} onChange={e => setTrainerId(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3">
            {trainers.length === 0 && <option value="">Zatím nejsou dostupní trenéři</option>}
            {trainers.map(t => <option key={t.id} value={t.id}>{trainerNames[t.id]}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Typ lekce
          <input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} required className="mt-1.5 w-full rounded-xl border bg-transparent p-3" />
        </label>
        <label className="text-sm font-medium">Datum a čas
          <input type="datetime-local" required min={new Date(Date.now() + 60000).toISOString().slice(0,16)} value={startsAt} onChange={e => setStartsAt(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3" />
        </label>
        <label className="text-sm font-medium">Délka
          <select value={duration} onChange={e => setDuration(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3">
            <option value="30">30 minut</option><option value="45">45 minut</option><option value="60">60 minut</option><option value="90">90 minut</option><option value="120">120 minut</option>
          </select>
        </label>
        <label className="text-sm font-medium">Cena (Kč; 0 = bezplatná)
          <input type="number" min="0" max="100000" step="1" value={price} onChange={e => setPrice(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3" />
        </label>
        <label className="text-sm font-medium sm:col-span-2">Poznámka pro trenéra
          <textarea rows={3} maxLength={1200} value={description} onChange={e => setDescription(e.target.value)} placeholder="Cíl lekce, zkušenosti psa, otázky…" className="mt-1.5 w-full resize-y rounded-xl border bg-transparent p-3" />
        </label>
        <button type="submit" disabled={saving || trainers.length === 0} className="rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving ? 'Odesílám…' : 'Odeslat žádost'}</button>
      </form>
    </section>}

    <section className="mt-8">
      <h2 className="text-lg font-semibold">Moje rezervace</h2>
      {loading ? <p className="mt-4 text-sm text-[var(--pm-muted)]">Načítám…</p> : reservations.length === 0 ? <p className="mt-4 rounded-2xl border border-dashed border-[var(--pm-line)] p-6 text-sm text-[var(--pm-muted)]">Zatím tu nejsou žádné rezervace.</p> : <div className="mt-4 grid gap-3 md:grid-cols-2">
        {reservations.map(r => <article key={r.id} className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4">
          <div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{r.title}</h3><span className="rounded-full bg-[var(--pm-page)] px-2.5 py-1 text-xs">{statusLabel[r.status] || r.status}</span></div>
          <p className="mt-2 text-sm text-[var(--pm-muted)]">{new Date(r.starts_at).toLocaleString('cs-CZ')} · {money(r.price_minor, r.currency)}</p>
          <p className="mt-1 text-xs text-[var(--pm-muted)]">{r.student_id === userId ? `Trenér: ${trainerNames[r.trainer_id] || 'PawMeet trenér'}` : 'Tvoje lekce'}</p>
          {r.description && <p className="mt-3 whitespace-pre-wrap text-sm">{r.description}</p>}
        </article>)}
      </div>}
    </section>
  </main>
}
