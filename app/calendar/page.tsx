'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

const supabase = createClient()
type EventItem = { id: string; title: string; description: string; starts_at: string; ends_at: string | null; location: string; event_type: string; capacity: number | null; is_online: boolean; created_by: string }
const categories = [{value:'meetup',label:'Setkání pejskařů'},{value:'training',label:'Trénink'},{value:'competition',label:'Závod'},{value:'walk',label:'Společná procházka'},{value:'online',label:'Online akce'},{value:'other',label:'Jiné'}]

export default function CalendarPage() {
  const [events,setEvents] = useState<EventItem[]>([])
  const [userId,setUserId] = useState('')
  const [loading,setLoading] = useState(true)
  const [showForm,setShowForm] = useState(false)
  const [error,setError] = useState('')
  const [notice,setNotice] = useState('')
  const [month,setMonth] = useState(new Date())
  const [joined,setJoined] = useState<string[]>([])
  const [form,setForm] = useState({title:'',description:'',starts_at:'',ends_at:'',location:'',event_type:'meetup',capacity:'',is_online:false})

  const load = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    setUserId(user?.id || '')
    const { data, error } = await supabase.from('events').select('id,title,description,starts_at,ends_at,location,event_type,capacity,is_online,created_by').eq('status','published').gte('starts_at',new Date(Date.now()-86400000).toISOString()).order('starts_at')
    if (error) setError('Akce se nepodařilo načíst. Zkontroluj databázovou migraci.')
    else setEvents((data || []) as EventItem[])
    if (user) {
      const { data: attendance } = await supabase.from('event_participants').select('event_id').eq('user_id',user.id)
      setJoined((attendance || []).map((x:{event_id:string})=>x.event_id))
    }
    setLoading(false)
  }
  useEffect(()=>{ void load() },[])
  const monthEvents = useMemo(()=>events.filter(e=>{const d=new Date(e.starts_at);return d.getMonth()===month.getMonth()&&d.getFullYear()===month.getFullYear()}),[events,month])

  const createEvent = async (e:FormEvent) => {
    e.preventDefault(); setError(''); setNotice('')
    const { data:{user} } = await supabase.auth.getUser()
    if (!user) { window.location.href='/login?redirectTo=%2Fcalendar'; return }
    if (!form.title.trim() || !form.starts_at) { setError('Vyplň název a datum začátku.'); return }
    const payload = {created_by:user.id,title:form.title.trim(),description:form.description.trim(),starts_at:new Date(form.starts_at).toISOString(),ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,location:form.location.trim(),event_type:form.event_type,capacity:form.capacity?Number(form.capacity):null,is_online:form.is_online}
    const {error} = await supabase.from('events').insert(payload)
    if (error) { setError('Akci se nepodařilo uložit: '+error.message); return }
    setNotice('Akce byla zveřejněna.'); setShowForm(false); setForm({title:'',description:'',starts_at:'',ends_at:'',location:'',event_type:'meetup',capacity:'',is_online:false}); await load()
  }
  const attend = async (eventId:string) => {
    const {data:{user}} = await supabase.auth.getUser()
    if (!user) { window.location.href='/login?redirectTo=%2Fcalendar'; return }
    if (joined.includes(eventId)) {
      const {error}=await supabase.from('event_participants').delete().eq('event_id',eventId).eq('user_id',user.id)
      if (error) {setError('Odhlášení se nezdařilo.');return}
      setJoined(v=>v.filter(id=>id!==eventId))
    } else {
      const {error}=await supabase.from('event_participants').insert({event_id:eventId,user_id:user.id})
      if (error) {setError(error.message.includes('duplicate')?'Na tuto akci už jsi přihlášen/a.':'Přihlášení se nezdařilo.');return}
      setJoined(v=>[...v,eventId])
    }
  }
  const report = async (eventId:string) => {
    const {data:{user}}=await supabase.auth.getUser()
    if (!user) {window.location.href='/login?redirectTo=%2Fcalendar';return}
    const reason=window.prompt('Proč chceš tuto akci nahlásit?')
    if (!reason?.trim()) return
    const {error}=await supabase.from('event_reports').insert({event_id:eventId,reporter_id:user.id,reason:reason.trim().slice(0,1000)})
    setNotice(error?'Akci se nepodařilo nahlásit nebo už jsi ji nahlásil/a.':'Děkujeme, hlášení bylo odesláno moderaci.')
  }
  const shiftMonth=(n:number)=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+n,1))
  const fmt=(value:string)=>new Intl.DateTimeFormat('cs-CZ',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value))
  return <div className="min-h-screen bg-[#f7f5ec] px-4 py-8 text-[#183d2c] md:px-8"><div className="mx-auto max-w-6xl">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#65856b]">Komunita PawMeet</p><h1 className="mt-2 text-4xl font-extrabold tracking-tight md:text-5xl">Kalendář akcí</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Společné procházky, tréninky, závody a setkání pejskařů na jednom místě.</p></div><div className="flex gap-2"><Link href="/chat" className="rounded-xl border border-[#d5e1d1] bg-white px-4 py-3 text-sm font-semibold">Zprávy</Link><button onClick={()=>setShowForm(v=>!v)} className="rounded-xl bg-[#24563b] px-4 py-3 text-sm font-bold text-white">{showForm?'Zavřít formulář':'+ Přidat akci'}</button></div></header>
    {(error||notice)&&<div role="status" className={`mt-5 rounded-xl p-3 text-sm ${error?'bg-red-50 text-red-700':'bg-[#e8f0e3] text-[#24563b]'}`}>{error||notice}</div>}
    {showForm&&<form onSubmit={createEvent} className="mt-6 grid gap-4 rounded-3xl border border-[#dce6d8] bg-white/90 p-5 shadow-sm md:grid-cols-2 md:p-7"><h2 className="text-xl font-bold md:col-span-2">Vytvořit komunitní akci</h2>
      <label className="text-sm font-semibold">Název<input required maxLength={120} value={form.title} onChange={e=>setForm({...form,title:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label>
      <label className="text-sm font-semibold">Typ akce<select value={form.event_type} onChange={e=>setForm({...form,event_type:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal">{categories.map(c=><option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
      <label className="text-sm font-semibold">Začátek<input required type="datetime-local" value={form.starts_at} onChange={e=>setForm({...form,starts_at:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label>
      <label className="text-sm font-semibold">Konec (nepovinné)<input type="datetime-local" value={form.ends_at} onChange={e=>setForm({...form,ends_at:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label>
      <label className="text-sm font-semibold">Místo nebo odkaz<input maxLength={300} value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal" placeholder="Park, adresa nebo online odkaz"/></label>
      <label className="text-sm font-semibold">Kapacita (nepovinná)<input type="number" min="1" value={form.capacity} onChange={e=>setForm({...form,capacity:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label>
      <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.is_online} onChange={e=>setForm({...form,is_online:e.target.checked})}/> Online akce</label>
      <label className="text-sm font-semibold md:col-span-2">Popis<textarea maxLength={5000} rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-1 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label>
      <button className="rounded-xl bg-[#24563b] p-3 font-bold text-white md:col-span-2">Zveřejnit akci</button>
    </form>}
    <section className="mt-8 rounded-3xl border border-[#dce6d8] bg-white/75 p-4 md:p-6"><div className="flex items-center justify-between gap-3"><button aria-label="Předchozí měsíc" onClick={()=>shiftMonth(-1)} className="rounded-xl border px-3 py-2">←</button><h2 className="text-lg font-bold capitalize">{new Intl.DateTimeFormat('cs-CZ',{month:'long',year:'numeric'}).format(month)}</h2><button aria-label="Další měsíc" onClick={()=>shiftMonth(1)} className="rounded-xl border px-3 py-2">→</button></div><p className="mt-2 text-xs text-slate-500">Měsíční přehled • {monthEvents.length} akcí</p></section>
    <section className="mt-5 grid gap-4 md:grid-cols-2">{loading?<p className="p-8 text-slate-500">Načítám akce…</p>:monthEvents.length===0?<div className="rounded-3xl border border-dashed border-[#cbdac6] bg-white/60 p-8 md:col-span-2"><h2 className="text-xl font-bold">V tomto měsíci zatím nic není</h2><p className="mt-2 text-sm text-slate-600">Přidej první procházku, trénink nebo setkání a pozvi komunitu.</p></div>:monthEvents.map(event=><article key={event.id} className="rounded-3xl border border-[#dce6d8] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-[#e8f0e3] px-3 py-1 text-xs font-bold text-[#24563b]">{categories.find(c=>c.value===event.event_type)?.label||'Akce'}</span><button onClick={()=>void report(event.id)} className="text-xs text-slate-500 underline">Nahlásit</button></div><h3 className="mt-4 text-xl font-bold">{event.title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{event.description||'Organizátor zatím nepřidal popis.'}</p><div className="mt-4 space-y-2 text-sm"><p>◷ {fmt(event.starts_at)}</p><p>⌖ {event.location||'Místo bude upřesněno'}{event.is_online?' · online':''}</p>{event.capacity&&<p>Kapacita: {event.capacity} osob</p>}</div><button onClick={()=>void attend(event.id)} className={`mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold ${joined.includes(event.id)?'border border-[#cbdac6] bg-white text-[#24563b]':'bg-[#24563b] text-white'}`}>{joined.includes(event.id)?'Odhlásit se z akce':'Zúčastním se'}</button></article>)}</section>
    <p className="mt-8 text-xs leading-5 text-slate-500">Akce vytvářejí přihlášení členové. Nevhodný obsah můžeš nahlásit moderaci. Účast a soukromí spravuj zodpovědně.</p>
  </div></div>
}
