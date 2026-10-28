'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Offer = { id:string; trainer_id:string; title:string; description:string|null; duration_minutes:number; price_minor:number; currency:string; is_active:boolean; created_at:string }
const supabase=createClient()
const money=(minor:number,currency:string)=>new Intl.NumberFormat('cs-CZ',{style:'currency',currency}).format(minor/100)

export default function TrainerOffersPage(){
 const [userId,setUserId]=useState('')
 const [role,setRole]=useState('')
 const [offers,setOffers]=useState<Offer[]>([])
 const [title,setTitle]=useState('Individuální lekce')
 const [description,setDescription]=useState('')
 const [duration,setDuration]=useState('60')
 const [price,setPrice]=useState('0')
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [notice,setNotice]=useState('')
 const allowed=['admin','administrator','trainer','trenér','trainer_verified','trenér ověřený']

 const load=useCallback(async()=>{
  setLoading(true)
  try{
   const {data:{user}}=await supabase.auth.getUser()
   if(!user){setNotice('Pro správu nabídek se přihlas.');return}
   setUserId(user.id)
   const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle()
   setRole(String(profile?.role||''))
   const {data,error}=await supabase.from('trainer_lesson_offers').select('*').order('created_at',{ascending:false})
   if(error)throw error
   setOffers((data||[]) as Offer[])
  }catch(error){console.error('Načtení nabídek selhalo:',error);setNotice('Nabídky se nepodařilo načíst.')}
  finally{setLoading(false)}
 },[])
 useEffect(()=>{void load()},[load])

 const add=async(event:FormEvent)=>{
  event.preventDefault()
  const amount=Math.round(Number(price)*100)
  const mins=Number(duration)
  if(!userId||!allowed.includes(role.toLowerCase())){setNotice('Nabídky mohou spravovat pouze schválení trenéři a administrátoři.');return}
  if(!title.trim()||!Number.isFinite(amount)||amount<0||amount>10000000||!Number.isInteger(mins)||mins<15||mins>240){setNotice('Zkontroluj název, délku 15–240 minut a cenu.');return}
  setSaving(true);setNotice('')
  const {error}=await supabase.from('trainer_lesson_offers').insert({trainer_id:userId,title:title.trim(),description:description.trim()||null,duration_minutes:mins,price_minor:amount,currency:'CZK',is_active:true})
  if(error){console.error('Vytvoření nabídky selhalo:',error);setNotice('Nabídku se nepodařilo uložit. Ověř svou roli trenéra.')}
  else{setTitle('Individuální lekce');setDescription('');setDuration('60');setPrice('0');setNotice('Nabídka byla uložena.');await load()}
  setSaving(false)
 }
 const toggle=async(offer:Offer)=>{
  const {error}=await supabase.from('trainer_lesson_offers').update({is_active:!offer.is_active,updated_at:new Date().toISOString()}).eq('id',offer.id)
  if(error){setNotice('Stav nabídky se nepodařilo změnit.');return}
  await load()
 }
 const canManage=allowed.includes(role.toLowerCase())

 return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
  <Link href="/reservations" className="text-sm font-semibold text-[var(--pm-green)] hover:underline">← Zpět na rezervace</Link>
  <header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">PawMeet · Trenér</p><h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Nabídky lekcí</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Nastav cenu a délku předem. Pejskaři pak rezervují konkrétní nabídku a nemohou měnit její cenu při objednávce.</p></header>
  {notice&&<p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm">{notice}</p>}
  {canManage&&<section className="mt-6 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5"><h2 className="text-lg font-semibold">Přidat nabídku</h2><form onSubmit={add} className="mt-4 grid gap-3 sm:grid-cols-2">
   <label className="text-sm font-medium">Název<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
   <label className="text-sm font-medium">Délka<select value={duration} onChange={e=>setDuration(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"><option value="15">15 minut</option><option value="30">30 minut</option><option value="45">45 minut</option><option value="60">60 minut</option><option value="90">90 minut</option><option value="120">120 minut</option><option value="180">180 minut</option><option value="240">240 minut</option></select></label>
   <label className="text-sm font-medium">Cena v Kč (0 = zdarma)<input required type="number" min="0" max="100000" step="1" value={price} onChange={e=>setPrice(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
   <label className="text-sm font-medium sm:col-span-2">Popis<textarea rows={3} maxLength={1200} value={description} onChange={e=>setDescription(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
   <button disabled={saving} className="rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving?'Ukládám…':'Uložit nabídku'}</button>
  </form></section>}
  <section className="mt-8"><h2 className="text-lg font-semibold">Nabídky trenérů</h2>{loading?<p className="mt-4 text-sm text-[var(--pm-muted)]">Načítám…</p>:offers.length===0?<p className="mt-4 rounded-2xl border border-dashed border-[var(--pm-line)] p-6 text-sm text-[var(--pm-muted)]">Zatím tu nejsou nabídky. Schválený trenér může přidat první.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{offers.map(o=><article key={o.id} className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{o.title}</h3><p className="mt-1 text-sm text-[var(--pm-muted)]">{o.duration_minutes} minut · {money(o.price_minor,o.currency)}</p></div><span className="rounded-full bg-[var(--pm-page)] px-2.5 py-1 text-xs">{o.is_active?'Aktivní':'Skrytá'}</span></div>{o.description&&<p className="mt-3 text-sm leading-6 text-[var(--pm-muted)]">{o.description}</p>}{(o.trainer_id===userId||role.toLowerCase()==='admin'||role.toLowerCase()==='administrator')&&<button type="button" onClick={()=>void toggle(o)} className="mt-4 text-sm font-semibold text-[var(--pm-green)]">{o.is_active?'Skrýt nabídku':'Znovu aktivovat'}</button>}</article>)}</div>}</section>
 </main>
}
