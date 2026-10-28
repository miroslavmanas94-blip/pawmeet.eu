'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Option = { id: string; label: string; position: number }
type Result = { option_id: string; vote_count: number; has_voted: boolean }
type Poll = { id: string; creator_id: string; question: string; closes_at: string | null; created_at: string; options: Option[]; results: Result[] }
const supabase = createClient()

export default function PollsPage() {
  const [polls, setPolls] = useState<Poll[]>([])
  const [userId, setUserId] = useState('')
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [closesAt, setClosesAt] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: authData }, { data, error }] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('polls').select('id,creator_id,question,closes_at,created_at').order('created_at', { ascending: false }).limit(100)
      ])
      setUserId(authData.user?.id || '')
      if (error) throw error
      const rows = await Promise.all((data || []).map(async (poll: Omit<Poll, 'options' | 'results'>) => {
        const [{ data: optionRows, error: optionError }, { data: resultRows, error: resultError }] = await Promise.all([
          supabase.from('poll_options').select('id,label,position').eq('poll_id', poll.id).order('position'),
          authData.user ? supabase.rpc('get_poll_results', { poll_uuid: poll.id }) : Promise.resolve({ data: [], error: null })
        ])
        if (optionError) throw optionError
        if (resultError) throw resultError
        return { ...poll, options: (optionRows || []) as Option[], results: (resultRows || []) as Result[] }
      }))
      setPolls(rows)
    } catch (error) {
      console.error('Načtení anket selhalo:', error)
      setNotice('Ankety se nepodařilo načíst. Zkus stránku obnovit.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setNotice('')
    const cleanOptions = options.map(x => x.trim())
    if (!userId) { setNotice('Pro vytvoření ankety se přihlas.'); return }
    if (cleanOptions.length < 2 || cleanOptions.length > 6 || cleanOptions.some(x => !x) || new Set(cleanOptions.map(x => x.toLocaleLowerCase())).size !== cleanOptions.length) {
      setNotice('Zadej 2–6 neprázdných a navzájem odlišných možností.')
      return
    }
    const closeDate = closesAt ? new Date(closesAt) : null
    if (closeDate && (!Number.isFinite(closeDate.getTime()) || closeDate.getTime() <= Date.now())) {
      setNotice('Konec ankety musí být v budoucnosti.')
      return
    }
    setSaving(true)
    try {
      const { error } = await supabase.rpc('create_poll', {
        question_text: question.trim(),
        option_labels: cleanOptions,
        close_time: closeDate?.toISOString() || null
      })
      if (error) throw error
      setQuestion(''); setOptions(['', '']); setClosesAt('')
      setNotice('Anketa byla vytvořena.')
      await load()
    } catch (error) {
      console.error('Vytvoření ankety selhalo:', error)
      setNotice('Anketu se nepodařilo vytvořit. Zkontroluj text a přihlášení.')
    } finally { setSaving(false) }
  }

  const vote = async (poll: Poll, optionId: string) => {
    if (!userId) { setNotice('Pro hlasování se přihlas.'); return }
    if (poll.results.some(r => r.has_voted) || (poll.closes_at && new Date(poll.closes_at).getTime() <= Date.now())) return
    setNotice('')
    const { error } = await supabase.from('poll_votes').insert({ poll_id: poll.id, option_id: optionId, user_id: userId })
    if (error) {
      setNotice(error.code === '23505' ? 'V této anketě už jsi hlasoval.' : 'Hlas se nepodařilo uložit.')
      return
    }
    await load()
  }

  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
    <Link href="/domu" className="text-sm font-semibold text-[var(--pm-green)] hover:underline">← Zpět do komunity</Link>
    <header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">PawMeet · Komunita</p><h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Ankety</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Zeptej se komunity. Každý účet má jeden hlas v anketě a každá anketa má 2–6 možností.</p></header>
    {notice && <p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm">{notice}</p>}
    {userId && <section className="mt-6 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5 md:p-6">
      <h2 className="text-lg font-semibold">Vytvořit anketu</h2>
      <form onSubmit={create} className="mt-4 grid gap-3">
        <label className="text-sm font-medium">Otázka<input required maxLength={300} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Na co se chceš zeptat pejskařů?" className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <div className="grid gap-2 sm:grid-cols-2">{options.map((option,i)=><label key={i} className="text-sm font-medium">Možnost {i+1}<input required maxLength={160} value={option} onChange={e=>setOptions(old=>old.map((v,j)=>i===j?e.target.value:v))} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>)}</div>
        <div className="flex flex-wrap gap-2">{options.length<6&&<button type="button" onClick={()=>setOptions(old=>[...old,''])} className="rounded-xl border border-[var(--pm-line)] px-3 py-2 text-sm">Přidat možnost</button>}{options.length>2&&<button type="button" onClick={()=>setOptions(old=>old.slice(0,-1))} className="rounded-xl border border-[var(--pm-line)] px-3 py-2 text-sm">Odebrat poslední</button>}</div>
        <label className="text-sm font-medium">Ukončit hlasování (volitelné)<input type="datetime-local" min={new Date(Date.now()+60000).toISOString().slice(0,16)} value={closesAt} onChange={e=>setClosesAt(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3 sm:max-w-sm"/></label>
        <button disabled={saving} className="rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?'Vytvářím…':'Vytvořit anketu'}</button>
      </form>
    </section>}
    <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Aktuální ankety</h2><span className="text-xs text-[var(--pm-muted)]">{polls.length}</span></div>
      {loading?<p className="mt-4 text-sm text-[var(--pm-muted)]">Načítám…</p>:polls.length===0?<p className="mt-4 rounded-2xl border border-dashed border-[var(--pm-line)] p-6 text-sm text-[var(--pm-muted)]">Zatím tu nejsou ankety. Můžeš vytvořit první.</p>:<div className="mt-4 grid gap-4 md:grid-cols-2">{polls.map(poll=>{
        const total=poll.results.reduce((sum,r)=>sum+Number(r.vote_count||0),0)
        const voted=poll.results.some(r=>r.has_voted)
        const closed=!!poll.closes_at&&new Date(poll.closes_at).getTime()<=Date.now()
        return <article key={poll.id} className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5">
          <div className="flex items-start justify-between gap-3"><h3 className="font-semibold leading-6">{poll.question}</h3><span className="shrink-0 rounded-full bg-[var(--pm-page)] px-2.5 py-1 text-xs text-[var(--pm-muted)]">{closed?'Ukončeno':voted?'Hlasováno':'Otevřeno'}</span></div>
          <p className="mt-2 text-xs text-[var(--pm-muted)]">{total} {total===1?'hlas':total>1&&total<5?'hlasy':'hlasů'}{poll.closes_at?' · Konec '+new Date(poll.closes_at).toLocaleString('cs-CZ'):''}</p>
          <div className="mt-4 space-y-2">{poll.options.map(option=>{const result=poll.results.find(r=>r.option_id===option.id);const count=Number(result?.vote_count||0);const percent=total?Math.round(count/total*100):0;return <div key={option.id} className="space-y-1"><button type="button" disabled={!userId||voted||closed||loading} onClick={()=>void vote(poll,option.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[var(--pm-line)] px-3 py-2.5 text-left text-sm hover:bg-[var(--pm-hover)] disabled:cursor-default disabled:opacity-80"><span>{option.label}</span><span className="shrink-0 text-xs text-[var(--pm-muted)]">{voted||closed?percent+'%':'Hlasovat'}</span></button>{(voted||closed)&&<div className="h-1.5 overflow-hidden rounded-full bg-[var(--pm-page)]"><div className="h-full rounded-full bg-[var(--pm-green)]" style={{width:percent+'%'}}/></div>}</div>})}</div>
          <p className="mt-4 text-xs text-[var(--pm-muted)]">Vytvořeno {new Date(poll.created_at).toLocaleDateString('cs-CZ')}</p>
        </article>
      })}</div>}
    </section>
  </main>
}
