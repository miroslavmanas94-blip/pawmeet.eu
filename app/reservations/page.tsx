'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Offer = { id:string; trainer_id:string; title:string; description:string|null; duration_minutes:number; price_minor:number; currency:string; is_active:boolean }
type Reservation = { id:string; student_id:string; trainer_id:string; offer_id:string|null; title:string; description:string|null; starts_at:string; ends_at:string|null; price_minor:number; currency:string; status:string; created_at:string }
type TrainerProfile = { id:string; username:string|null; display_name:string|null; full_name:string|null }
const supabase=createClient()
const money=(minor:number,currency:string)=>new Intl.NumberFormat('cs-CZ',{style:'currency',currency}).format(minor/100)
const statusLabel:Record<string,string>={pending:'Čeká na potvrzení',confirmed:'Potvrzeno',cancelled:'Zrušeno',completed:'Dokončeno',payment_pending:'Čeká na platbu',paid:'Zaplaceno',refunded:'Vráceno'}

export default function ReservationsPage(){
 const [userId,setUserId]=useState('')
 const [role,setRole]=useState('')
 const [offers,setOffers]=useState<Offer[]>([])
 const [reservations,setReservations]=useState<Reservation[]>([])
 const [trainerNames,setTrainerNames]=useState<Record<string,string>>({})
 const [offerId,setOfferId]=useState('')
 const [description,setDescription]=useState('')
 const [startsAt,setStartsAt]=useState('')
 const [loading,setLoading]=useState(true)
 const [saving,setSaving]=useState(false)
 const [notice,setNotice]=useState('')

 const load=useCallback(async()=>{
  setLoading(true)
  try{
   const {data:{user},error:authError}=await supabase.auth.getUser()
   if(authError)throw authError
   if(!user){setUserId('');setNotice('Pro rezervaci lekce se nejdřív přihlas.');return}
   setUserId(user.id)
   const {data:ownProfile}=await supabase.from('profiles').select('role').eq('id',user.id).maybeSingle()
   setRole(String(ownProfile?.role||''))
   const [{data:offerRows,error:offerError},{data:reservationRows,error:reservationError}]=await Promise.all([
    supabase.from('trainer_lesson_offers').select('id,trainer_id,title,description,duration_minutes,price_minor,currency,is_active').eq('is_active',true).order('title'),
    supabase.from('reservations').select('*').or('student_id.eq.'+user.id+',trainer_id.eq.'+user.id).order('starts_at',{ascending:false}).limit(100)
   ])
   if(offerError)throw offerError
   if(reservationError)throw reservationError
   const safeOffers=(offerRows||[]) as Offer[]
   setOffers(safeOffers)
   setReservations((reservationRows||[]) as Reservation[])
   setOfferId(current=>current||safeOffers[0]?.id||'')
   const ids=Array.from(new Set([...safeOffers.map(o=>o.trainer_id),...(reservationRows||[]).map((r:Reservation)=>r.trainer_id)]))
   if(ids.length){
    const {data:profiles}=await supabase.from('profiles').select('id,username,display_name,full_name').in('id',ids)
    const names=Object.fromEntries(((profiles||[]) as TrainerProfile[]).map(p=>[p.id,p.display_name||p.full_name||p.username||'Trenér']))
    setTrainerNames(names)
   }
  }catch(error){console.error('Načtení rezervací selhalo:',error);setNotice('Rezervace se nepodařilo načíst. Zkus stránku obnovit.')}
  finally{setLoading(false)}
 },[])

 useEffect(()=>{void load()},[load])
 useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get('payment')==='success')setNotice('Platba byla odeslána. Stav rezervace se změní po ověření potvrzení od Stripe.');else if(params.get('payment')==='canceled')setNotice('Platba byla zrušena. Rezervace zůstává rozpracovaná a můžeš se k platbě vrátit později.')},[])

 const startCheckout=async(reservationId:string)=>{
  setSaving(true);setNotice('')
  try{
   const {data:{session}}=await supabase.auth.getSession()
   if(!session?.access_token){setNotice('Přihlášení vypršelo. Přihlas se znovu.');return}
   const response=await fetch('/api/reservations/checkout',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify({reservationId})})
   const result=await response.json()
   if(!response.ok||!result.url)throw new Error(result.error||'Platbu se nepodařilo připravit.')
   window.location.assign(result.url)
  }catch(error){console.error('Příprava platby selhala:',error);setNotice(error instanceof Error?error.message:'Platbu se nepodařilo připravit.')}
  finally{setSaving(false)}
 }

 const submit=async(event:FormEvent)=>{
  event.preventDefault();setNotice('')
  if(!userId){setNotice('Pro vytvoření rezervace se přihlas.');return}
  const offer=offers.find(o=>o.id===offerId)
  const start=new Date(startsAt)
  if(!offer||!Number.isFinite(start.getTime())||start.getTime()<=Date.now()){setNotice('Vyber nabídku a budoucí termín.');return}
  setSaving(true)
  try{
   const end=new Date(start.getTime()+offer.duration_minutes*60000)
   const {data:reservation,error}=await supabase.from('reservations').insert({
    student_id:userId,trainer_id:offer.trainer_id,offer_id:offer.id,title:offer.title,
    description:description.trim()||offer.description||null,starts_at:start.toISOString(),ends_at:end.toISOString(),
    price_minor:offer.price_minor,currency:offer.currency,status:offer.price_minor>0?'payment_pending':'pending'
   }).select('*').single()
   if(error)throw error
   setDescription('');setStartsAt('')
   if(offer.price_minor>0){
    setNotice('Rezervace byla vytvořena. Přesměrovávám na zabezpečenou platbu…')
    await startCheckout(reservation.id)
   }else{
    setNotice('Žádost o bezplatnou lekci byla odeslána trenérovi.')
    await load()
   }
  }catch(error){console.error('Vytvoření rezervace selhalo:',error);setNotice('Rezervaci se nepodařilo vytvořit. Zkontroluj přihlášení a vybranou nabídku.')}
  finally{setSaving(false)}
 }

 const confirmReservation=async(reservation:Reservation)=>{
  if(!['trainer','trenér','trainer_verified','trenér ověřený','admin','administrator'].includes(role.toLowerCase()))return
  setSaving(true);setNotice('')
  const {error}=await supabase.from('reservations').update({status:'confirmed'}).eq('id',reservation.id).eq('trainer_id',userId)
  if(error){console.error('Potvrzení rezervace selhalo:',error);setNotice('Rezervaci se nepodařilo potvrdit. Placené lekce lze potvrdit až po ověření platby.')}else{setNotice('Rezervace byla potvrzena.');await load()}
  setSaving(false)
 }

 const selectedOffer=offers.find(o=>o.id===offerId)
 return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
  <Link href="/profile" className="text-sm font-semibold text-[var(--pm-green)] hover:underline">← Zpět na profil</Link>
  <header className="mt-6 max-w-2xl"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">PawMeet · Trénink</p><h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Rezervace lekcí</h1><p className="mt-3 text-sm leading-6 text-[var(--pm-muted)]">Vyber zveřejněnou nabídku trenéra. Cena a délka se přebírají z nabídky a nelze je při rezervaci upravit. Placené lekce se hradí přes Stripe.</p></header>
  {notice&&<p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm">{notice}</p>}
  {userId&&<section className="mt-6 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5 md:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><h2 className="text-lg font-semibold">Požádat o lekci</h2><Link href="/trainer/offers" className="text-sm font-semibold text-[var(--pm-green)] underline">Správa nabídek trenéra</Link></div>
   <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
    <label className="text-sm font-medium sm:col-span-2">Nabídka lekce<select required value={offerId} onChange={e=>setOfferId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"><option value="">Vyber nabídku</option>{offers.map(o=><option key={o.id} value={o.id}>{(trainerNames[o.trainer_id]||'Trenér')+' · '+o.title+' · '+o.duration_minutes+' min · '+money(o.price_minor,o.currency)}</option>)}</select></label>
    {selectedOffer&&<div className="rounded-xl bg-[var(--pm-page)] p-3 text-sm sm:col-span-2"><p className="font-semibold">{selectedOffer.title}</p><p className="mt-1 text-[var(--pm-muted)]">{trainerNames[selectedOffer.trainer_id]||'PawMeet trenér'} · {selectedOffer.duration_minutes} minut · {money(selectedOffer.price_minor,selectedOffer.currency)}</p>{selectedOffer.description&&<p className="mt-2 text-[var(--pm-muted)]">{selectedOffer.description}</p>}</div>}
    <label className="text-sm font-medium sm:col-span-2">Datum a čas<input type="datetime-local" required min={new Date(Date.now()+60000).toISOString().slice(0,16)} value={startsAt} onChange={e=>setStartsAt(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
    <label className="text-sm font-medium sm:col-span-2">Poznámka pro trenéra<textarea rows={3} maxLength={1200} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Cíl lekce, zkušenosti psa, otázky…" className="mt-1.5 w-full resize-y rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
    <button type="submit" disabled={saving||offers.length===0} className="rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving?'Zpracovávám…':selectedOffer&&selectedOffer.price_minor>0?'Rezervovat a zaplatit':'Odeslat žádost'}</button>
    {offers.length===0&&<p className="text-sm text-[var(--pm-muted)] sm:col-span-2">Zatím nejsou zveřejněné nabídky. Trenér může přidat lekci přes správu nabídek.</p>}
   </form>
  </section>}
  <section className="mt-8"><h2 className="text-lg font-semibold">Moje rezervace</h2>{loading?<p className="mt-4 text-sm text-[var(--pm-muted)]">Načítám…</p>:reservations.length===0?<p className="mt-4 rounded-2xl border border-dashed border-[var(--pm-line)] p-6 text-sm text-[var(--pm-muted)]">Zatím tu nejsou žádné rezervace.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{reservations.map(r=><article key={r.id} className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold">{r.title}</h3><span className="rounded-full bg-[var(--pm-page)] px-2.5 py-1 text-xs">{statusLabel[r.status]||r.status}</span></div><p className="mt-2 text-sm text-[var(--pm-muted)]">{new Date(r.starts_at).toLocaleString('cs-CZ')} · {money(r.price_minor,r.currency)}</p><p className="mt-1 text-xs text-[var(--pm-muted)]">{r.student_id===userId?'Trenér: '+(trainerNames[r.trainer_id]||'PawMeet trenér'):'Tvoje lekce'}</p>{r.description&&<p className="mt-3 whitespace-pre-wrap text-sm">{r.description}</p>}{r.student_id===userId&&r.status==='payment_pending'&&r.price_minor>0&&<button type="button" disabled={saving} onClick={()=>void startCheckout(r.id)} className="mt-3 rounded-xl bg-[var(--pm-green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Pokračovat k platbě</button>}{r.trainer_id===userId&&['trainer','trenér','trainer_verified','trenér ověřený','admin','administrator'].includes(role.toLowerCase())&&(r.status==='pending'||r.status==='paid')&&<button type="button" disabled={saving} onClick={()=>void confirmReservation(r)} className="mt-3 rounded-xl bg-[var(--pm-green)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Potvrdit lekci</button>}</article>)}</div>}</section>
 </main>
}
