'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { ArrowLeft, CalendarDays, Check, CheckCircle2, Clock3, Dog, Plus, Target, Trash2, Trophy } from 'lucide-react'

type Pet = { id: string; name: string | null; breed: string | null }
type Log = { id: string; pet_id: string | null; title: string; activity_type: string; notes: string; duration_minutes: number; mood_rating: number | null; success_rating: number | null; difficulty: string; next_reminder_at: string | null; created_at: string }
type Goal = { id: string; pet_id: string | null; title: string; description: string; target_date: string | null; is_completed: boolean; created_at: string }

const activities = ['Poslušnost', 'Přivolání', 'Chůze na vodítku', 'Socializace', 'Dog Puller', 'Agility', 'Dogdancing', 'Čichací hry', 'Triky a hry', 'Každodenní výchova', 'Péče']
const ratingOptions = [1, 2, 3, 4, 5]

export default function TrainingPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [userId, setUserId] = useState('')
  const [pets, setPets] = useState<Pet[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [selectedPet, setSelectedPet] = useState('all')
  const [title, setTitle] = useState('')
  const [activity, setActivity] = useState(activities[0])
  const [duration, setDuration] = useState('10')
  const [notes, setNotes] = useState('')
  const [mood, setMood] = useState(4)
  const [success, setSuccess] = useState(4)
  const [difficulty, setDifficulty] = useState('běžná')
  const [reminder, setReminder] = useState('')
  const [goalTitle, setGoalTitle] = useState('')
  const [goalDescription, setGoalDescription] = useState('')
  const [goalDate, setGoalDate] = useState('')
  const [showLogForm, setShowLogForm] = useState(false)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  async function loadData(uid: string) {
    const [petResult, logResult, goalResult] = await Promise.all([
      supabase.from('pets').select('id,name,breed').eq('user_id', uid).order('created_at', { ascending: false }),
      supabase.from('training_logs').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(100),
      supabase.from('training_goals').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(100)
    ])
    if (petResult.error) setNotice('Psí profily se nepodařilo načíst. Záznamy tréninku můžeš přidávat i bez přiřazení psa.')
    if (logResult.error) throw logResult.error
    if (goalResult.error) throw goalResult.error
    setPets((petResult.data || []) as Pet[])
    setLogs((logResult.data || []) as Log[])
    setGoals((goalResult.data || []) as Goal[])
  }

  useEffect(() => {
    let cancelled = false
    async function init() {
      const { data, error } = await supabase.auth.getUser()
      if (cancelled) return
      if (error || !data.user) {
        router.replace('/login?next=%2Ftraining')
        return
      }
      setUserId(data.user.id)
      try {
        await loadData(data.user.id)
      } catch {
        setNotice('Nepodařilo se načíst tréninková data. Obnov stránku a zkus to znovu.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void init()
    return () => { cancelled = true }
  }, [router, supabase])

  const visibleLogs = logs.filter(log => selectedPet === 'all' || log.pet_id === selectedPet)
  const visibleGoals = goals.filter(goal => selectedPet === 'all' || goal.pet_id === selectedPet)
  const totalMinutes = visibleLogs.reduce((sum, log) => sum + (log.duration_minutes || 0), 0)
  const completedGoals = visibleGoals.filter(goal => goal.is_completed).length

  async function saveLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId || !title.trim()) return
    setSaving(true)
    setNotice('')
    const { data, error } = await supabase.from('training_logs').insert({
      user_id: userId,
      pet_id: selectedPet === 'all' ? null : selectedPet,
      title: title.trim(),
      activity_type: activity,
      duration_minutes: Math.max(1, Math.min(600, Number(duration) || 10)),
      notes: notes.trim(),
      mood_rating: mood,
      success_rating: success,
      difficulty,
      next_reminder_at: reminder ? new Date(reminder).toISOString() : null
    }).select('*').single()
    if (error) {
      setNotice('Záznam se nepodařilo uložit. Zkontroluj připojení a oprávnění účtu.')
    } else {
      setLogs(current => [data as Log, ...current])
      setTitle('')
      setNotes('')
      setReminder('')
      setShowLogForm(false)
      setNotice('Tréninkový záznam je uložený.')
    }
    setSaving(false)
  }

  async function saveGoal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!userId || !goalTitle.trim()) return
    setSaving(true)
    setNotice('')
    const { data, error } = await supabase.from('training_goals').insert({
      user_id: userId,
      pet_id: selectedPet === 'all' ? null : selectedPet,
      title: goalTitle.trim(),
      description: goalDescription.trim(),
      target_date: goalDate || null
    }).select('*').single()
    if (error) {
      setNotice('Cíl se nepodařilo uložit. Zkus to prosím znovu.')
    } else {
      setGoals(current => [data as Goal, ...current])
      setGoalTitle('')
      setGoalDescription('')
      setGoalDate('')
      setShowGoalForm(false)
      setNotice('Nový tréninkový cíl je uložený.')
    }
    setSaving(false)
  }

  async function toggleGoal(goal: Goal) {
    const { error } = await supabase.from('training_goals').update({ is_completed: !goal.is_completed, updated_at: new Date().toISOString() }).eq('id', goal.id).eq('user_id', userId)
    if (error) {
      setNotice('Změnu cíle se nepodařilo uložit.')
      return
    }
    setGoals(current => current.map(item => item.id === goal.id ? { ...item, is_completed: !item.is_completed } : item))
  }

  async function deleteLog(id: string) {
    const { error } = await supabase.from('training_logs').delete().eq('id', id).eq('user_id', userId)
    if (error) {
      setNotice('Záznam se nepodařilo odstranit.')
      return
    }
    setLogs(current => current.filter(log => log.id !== id))
    setNotice('Záznam byl odstraněn.')
  }

  if (loading) return <main className="min-h-screen bg-[#f6f5ed] p-8 text-[#244a35]"><p>Načítám tréninkový deník…</p></main>

  return <main className="min-h-screen bg-[#f6f5ed] px-4 pb-28 pt-6 text-[#173d2d] md:px-8 md:pt-10">
    <div className="mx-auto max-w-6xl">
      <Link href="/domu" className="inline-flex items-center gap-2 text-sm font-semibold text-[#52735e] hover:text-[#173d2d]"><ArrowLeft size={17} /> Zpět na PawMeet</Link>
      <section className="mt-6 overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#163e2c] via-[#245b40] to-[#487750] p-6 text-white shadow-xl shadow-emerald-950/10 md:p-9">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-2xl"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-100/80">PawMeet Akademie</p><h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">Tréninkový deník</h1><p className="mt-4 max-w-xl leading-7 text-white/80">Každý malý pokrok se počítá. Zapisuj lekce, sleduj cíle a plánuj další krok se svým psem.</p></div>
          <label className="min-w-48 text-sm font-semibold text-white/90">Zobrazit záznamy pro<select value={selectedPet} onChange={e => setSelectedPet(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-3 text-white outline-none [&>option]:text-slate-900"><option value="all">Všichni psi / bez přiřazení</option>{pets.map(pet => <option key={pet.id} value={pet.id}>{pet.name || 'Pes bez jména'}</option>)}</select></label>
        </div>
      </section>

      {notice && <p role="status" className="mt-4 rounded-xl border border-[#dce7d8] bg-white px-4 py-3 text-sm text-[#45634c]">{notice}</p>}

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#dfe6d9] bg-white p-5"><div className="flex items-center gap-2 text-sm text-[#6b7d70]"><Clock3 size={17} /> Celkový čas</div><p className="mt-3 text-3xl font-bold">{totalMinutes}<span className="ml-2 text-sm font-medium text-[#738275]">min</span></p></div>
        <div className="rounded-2xl border border-[#dfe6d9] bg-white p-5"><div className="flex items-center gap-2 text-sm text-[#6b7d70]"><Target size={17} /> Záznamy</div><p className="mt-3 text-3xl font-bold">{visibleLogs.length}</p></div>
        <div className="rounded-2xl border border-[#dfe6d9] bg-white p-5"><div className="flex items-center gap-2 text-sm text-[#6b7d70]"><Trophy size={17} /> Splněné cíle</div><p className="mt-3 text-3xl font-bold">{completedGoals}<span className="ml-2 text-sm font-medium text-[#738275]">/ {visibleGoals.length}</span></p></div>
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-3xl border border-[#dfe6d9] bg-white p-5 md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Historie tréninku</h2><p className="mt-1 text-sm text-[#738275]">Posledních {visibleLogs.length} záznamů pro zvolený filtr.</p></div><button onClick={() => setShowLogForm(value => !value)} className="inline-flex items-center gap-2 rounded-xl bg-[#245b40] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#19462f]"><Plus size={17} /> Přidat záznam</button></div>
          {showLogForm && <form onSubmit={saveLog} className="mt-5 space-y-4 rounded-2xl bg-[#f7f9f4] p-4">
            <label className="block text-sm font-semibold">Co jste trénovali?<input required value={title} onChange={e => setTitle(e.target.value)} maxLength={160} placeholder="Např. přivolání v parku" className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#6b9a70]" /></label>
            <div className="grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">Typ aktivity<select value={activity} onChange={e => setActivity(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal">{activities.map(item => <option key={item}>{item}</option>)}</select></label><label className="block text-sm font-semibold">Délka (minuty)<input type="number" min="1" max="600" value={duration} onChange={e => setDuration(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal" /></label></div>
            <label className="block text-sm font-semibold">Poznámky<textarea value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} rows={3} placeholder="Co se povedlo, co bylo těžké a co zkusíte příště…" className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal outline-none focus:border-[#6b9a70]" /></label>
            <div className="grid gap-3 sm:grid-cols-3"><label className="block text-sm font-semibold">Nálada psa<select value={mood} onChange={e => setMood(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal">{ratingOptions.map(n => <option key={n} value={n}>{n}/5</option>)}</select></label><label className="block text-sm font-semibold">Úspěšnost<select value={success} onChange={e => setSuccess(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal">{ratingOptions.map(n => <option key={n} value={n}>{n}/5</option>)}</select></label><label className="block text-sm font-semibold">Obtížnost<select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal"><option>lehká</option><option>běžná</option><option>náročná</option></select></label></div>
            <label className="block text-sm font-semibold">Připomenout další trénink (volitelné)<input type="datetime-local" value={reminder} onChange={e => setReminder(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setShowLogForm(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-[#617364] hover:bg-white">Zrušit</button><button disabled={saving} className="rounded-xl bg-[#245b40] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Ukládám…' : 'Uložit záznam'}</button></div>
          </form>}
          <div className="mt-5 space-y-3">{visibleLogs.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d6e0d2] p-7 text-center"><Dog className="mx-auto text-[#7b9c7e]" size={28} /><p className="mt-3 font-semibold">Zatím žádné záznamy</p><p className="mt-1 text-sm text-[#748276]">První tréninkový záznam ti pomůže sledovat pokrok v čase.</p></div> : visibleLogs.map(log => <article key={log.id} className="rounded-2xl border border-[#e5ebe1] p-4 transition hover:border-[#c5d8c1]"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-[#eaf2e6] px-2.5 py-1 text-xs font-semibold text-[#356346]">{log.activity_type}</span><span className="text-xs text-[#819083]">{new Date(log.created_at).toLocaleDateString('cs-CZ')}</span></div><h3 className="mt-2 font-bold">{log.title}</h3><p className="mt-1 text-sm text-[#748276]">{pets.find(pet => pet.id === log.pet_id)?.name || 'Bez přiřazeného psa'} · {log.duration_minutes} min · nálada {log.mood_rating ?? '–'}/5 · úspěch {log.success_rating ?? '–'}/5</p>{log.notes && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#4b6252]">{log.notes}</p>}{log.next_reminder_at && <p className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-[#52735e]"><CalendarDays size={14} /> Další trénink: {new Date(log.next_reminder_at).toLocaleString('cs-CZ')}</p>}</div><button aria-label="Odstranit záznam" onClick={() => void deleteLog(log.id)} className="rounded-lg p-2 text-[#819083] hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></article>)}</div>
        </div>

        <div className="rounded-3xl border border-[#dfe6d9] bg-white p-5 md:p-7">
          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-bold">Tréninkové cíle</h2><p className="mt-1 text-sm text-[#738275]">Rozděl velké plány na malé kroky.</p></div><button onClick={() => setShowGoalForm(value => !value)} className="inline-flex items-center gap-2 rounded-xl border border-[#dce4d8] px-3 py-2.5 text-sm font-semibold hover:bg-[#f7f9f4]"><Plus size={16} /> Přidat cíl</button></div>
          {showGoalForm && <form onSubmit={saveGoal} className="mt-5 space-y-3 rounded-2xl bg-[#f7f9f4] p-4"><label className="block text-sm font-semibold">Název cíle<input required value={goalTitle} onChange={e => setGoalTitle(e.target.value)} maxLength={160} placeholder="Např. přivolání na dlouhém vodítku" className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold">Popis<textarea value={goalDescription} onChange={e => setGoalDescription(e.target.value)} maxLength={2000} rows={2} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal" /></label><label className="block text-sm font-semibold">Cílové datum<input type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[#dce4d8] bg-white px-3 py-2.5 font-normal" /></label><button disabled={saving} className="w-full rounded-xl bg-[#245b40] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Ukládám…' : 'Uložit cíl'}</button></form>}
          <div className="mt-5 space-y-3">{visibleGoals.length === 0 ? <div className="rounded-2xl border border-dashed border-[#d6e0d2] p-7 text-center"><Target className="mx-auto text-[#7b9c7e]" size={28} /><p className="mt-3 font-semibold">Nastav si první cíl</p><p className="mt-1 text-sm text-[#748276]">Třeba klidnější chůzi na vodítku nebo spolehlivější přivolání.</p></div> : visibleGoals.map(goal => <article key={goal.id} className={`rounded-2xl border p-4 transition ${goal.is_completed ? 'border-[#cfe1c9] bg-[#f6faf3]' : 'border-[#e5ebe1]'}`}><div className="flex items-start gap-3"><button aria-label={goal.is_completed ? 'Označit cíl jako nesplněný' : 'Označit cíl jako splněný'} onClick={() => void toggleGoal(goal)} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${goal.is_completed ? 'border-[#4b8054] bg-[#4b8054] text-white' : 'border-[#c7d4c4] text-transparent hover:border-[#4b8054]'}`}><Check size={14} /></button><div className="min-w-0 flex-1"><h3 className={`font-bold ${goal.is_completed ? 'text-[#6d806f] line-through' : ''}`}>{goal.title}</h3>{goal.description && <p className="mt-1 text-sm leading-6 text-[#748276]">{goal.description}</p>}<p className="mt-2 text-xs text-[#819083]">{pets.find(pet => pet.id === goal.pet_id)?.name || 'Bez přiřazeného psa'}{goal.target_date ? ' · termín ' + new Date(goal.target_date + 'T12:00:00').toLocaleDateString('cs-CZ') : ''}</p></div>{goal.is_completed && <CheckCircle2 className="text-[#4b8054]" size={18} />}</div></article>)}</div>
        </div>
      </section>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm"><Link href="/ai" className="rounded-xl border border-[#dce4d8] bg-white px-4 py-2.5 font-semibold hover:bg-[#f7f9f4]">Otevřít PawMeet AI</Link><Link href="/calendar" className="rounded-xl border border-[#dce4d8] bg-white px-4 py-2.5 font-semibold hover:bg-[#f7f9f4]">Kalendář akcí</Link></div>
    </div>
  </main>
}
