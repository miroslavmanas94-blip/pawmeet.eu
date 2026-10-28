'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Preferences = {
  profileVisibility: string
  storyAudience: string
  activityStatus: boolean
  messageRequests: boolean
  pushNotifications: boolean
  emailNotifications: boolean
  soundEffects: boolean
  reduceMotion: boolean
  language: string
  mapVisibility: boolean
}
const defaults: Preferences = { profileVisibility:'public', storyAudience:'followers', activityStatus:true, messageRequests:true, pushNotifications:true, emailNotifications:false, soundEffects:true, reduceMotion:false, language:'cs', mapVisibility:false }
const options: {key:keyof Preferences;title:string;description:string}[] = [
 {key:'activityStatus',title:'Zobrazovat aktivitu',description:'Ostatní uvidí, že jsi právě aktivní.'},
 {key:'messageRequests',title:'Povolit nové zprávy',description:'Lidé, se kterými si ještě nepíšeš, ti mohou poslat žádost o zprávu.'},
 {key:'pushNotifications',title:'Push upozornění',description:'Připraví nastavení pro upozornění na zařízení, pokud jsou v prohlížeči povolena.'},
 {key:'emailNotifications',title:'E-mailová upozornění',description:'Volba pro důležité novinky a oznámení e-mailem.'},
 {key:'soundEffects',title:'Zvuky v aplikaci',description:'Zvuky při zprávách a dalších interakcích.'},
 {key:'reduceMotion',title:'Omezit animace',description:'Omezí přechody a pohybové efekty.'},
 {key:'mapVisibility',title:'Zobrazit mě na mapě',description:'Souhlas se zobrazením polohy na mapě spravuj také přímo na stránce Mapa.'}
]
export default function SettingsPage(){
 const [prefs,setPrefs]=useState<Preferences>(defaults)
 const [loaded,setLoaded]=useState(false)
 const [saved,setSaved]=useState(false)
 const [notice,setNotice]=useState('')
 useEffect(()=>{if(new URLSearchParams(window.location.search).get('section')==='privacy'){document.getElementById('privacy-section')?.scrollIntoView({behavior:'auto',block:'start'})}},[])
 useEffect(()=>{let cancelled=false;const load=async()=>{try{const stored=localStorage.getItem('pawmeet-preferences-v1');if(stored&&!cancelled)setPrefs(current=>({...current,...JSON.parse(stored)}));const {data:{user}}=await createClient().auth.getUser();const accountPrefs=user?.user_metadata?.pawmeet_preferences;if(accountPrefs&&!cancelled)setPrefs(current=>({...current,...accountPrefs}))}catch{}finally{if(!cancelled)setLoaded(true)}};load();return()=>{cancelled=true}},[])
 useEffect(()=>{if(!loaded)return;document.documentElement.dataset.reduceMotion=prefs.reduceMotion?'true':'false';document.documentElement.lang=prefs.language;try{localStorage.setItem('pawmeet-preferences-v1',JSON.stringify(prefs))}catch{setSaved(false)}},[prefs,loaded])
 const update=async(key:keyof Preferences,value:any)=>{
   if(key==='pushNotifications' && value && 'Notification' in window && Notification.permission==='default'){
     const permission=await Notification.requestPermission()
     if(permission!=='granted'){setNotice('Prohlížeč nepovolil oznámení. Nastavení můžeš změnit v oprávněních webu.');value=false}
     else setNotice('Oznámení jsou povolena v tomto prohlížeči. Pro doručování i při zavřené aplikaci je ještě potřeba serverová Push konfigurace.')
   }
   if(key==='mapVisibility'){
     try{
       const supabase=createClient()
       const {data:{user}}=await supabase.auth.getUser()
       if(!user){setNotice('Pro změnu viditelnosti mapy se nejdřív přihlas.');value=false}
       else{
         const {data:updatedLocations,error}=await supabase.from('user_locations').update({is_active:Boolean(value)}).eq('user_id',user.id).select('user_id')
         if(error)throw error
         if(value && (!updatedLocations || updatedLocations.length===0)){
           setNotice('Nejdřív na stránce Mapa sdílej polohu. Samotné zapnutí tohoto přepínače polohu nevytvoří.')
           value=false
         }else{
           setNotice(value?'Zobrazení uložené polohy na mapě PawMeet je zapnuté.':'Tvoje uložená poloha se na mapě PawMeet přestane zobrazovat. Databázová pravidla veřejného čtení tím neměním.')
         }
       }
     }catch(error){console.error('Změna viditelnosti polohy selhala:',error);setNotice('Viditelnost polohy se nepodařilo změnit.');value=false}
   }
   setPrefs(p=>({...p,[key]:value}));setSaved(false)
 }
 const save=async()=>{try{localStorage.setItem('pawmeet-preferences-v1',JSON.stringify(prefs));document.documentElement.dataset.reduceMotion=prefs.reduceMotion?'true':'false';document.documentElement.lang=prefs.language;const supabase=createClient();const {data:{user}}=await supabase.auth.getUser();if(user){const {error}=await supabase.auth.updateUser({data:{pawmeet_preferences:prefs}});if(error)throw error;setNotice('Nastavení bylo uloženo v tomto prohlížeči i u tvého účtu.')}else{setNotice('Nastavení bylo uloženo v tomto prohlížeči. Přihlas se pro uložení k účtu.')}setSaved(true)}catch(error){console.error('Uložení nastavení selhalo:',error);setSaved(false);setNotice('Nastavení se nepodařilo uložit k účtu. Lokální preference zůstaly v tomto prohlížeči.')}}
 return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 pb-28 text-[#183d2c] md:px-8"><Link href="/profile" className="text-sm font-bold text-[#477353] hover:underline">← Zpět na profil</Link><div className="mt-6"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#66816a]">Můj účet</p><h1 className="mt-2 text-4xl font-black tracking-tight text-[#174b35]">Nastavení PawMeet</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Přizpůsob si chování aplikace. Změny se ukládají automaticky v tomto prohlížeči; některé funkce vyžadují ještě propojení se serverem.</p></div>
 <section id="privacy-section" className="pawmeet-glass mt-7 rounded-3xl p-5 md:p-7"><h2 className="text-xl font-extrabold">Soukromí</h2><div className="mt-5 grid gap-5 sm:grid-cols-2"><label className="text-sm font-bold">Viditelnost profilu<select value={prefs.profileVisibility} onChange={e=>update('profileVisibility',e.target.value)} className="mt-2 w-full rounded-xl border bg-white/70 p-3 font-normal"><option value="public">Veřejný</option><option value="members">Jen přihlášení členové</option><option value="private">Soukromý</option></select></label><label className="text-sm font-bold">Kdo uvidí moje příběhy<select value={prefs.storyAudience} onChange={e=>update('storyAudience',e.target.value)} className="mt-2 w-full rounded-xl border bg-white/70 p-3 font-normal"><option value="public">Všichni</option><option value="followers">Sledující</option><option value="private">Jen já</option></select></label></div><div className="mt-5 space-y-4">{options.filter(o=>['activityStatus','messageRequests','mapVisibility'].includes(o.key)).map(o=><label key={o.key} className="flex items-start justify-between gap-4 border-t border-[#dce6d8] pt-4"><span><span className="block text-sm font-bold">{o.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{o.description}</span></span><input type="checkbox" checked={Boolean(prefs[o.key])} onChange={e=>update(o.key,e.target.checked)} className="mt-1 h-4 w-4 accent-[#286747]"/></label>)}</div></section>
 <section className="pawmeet-glass mt-5 rounded-3xl p-5 md:p-7"><h2 className="text-xl font-extrabold">Upozornění a pohodlí</h2><div className="mt-4 space-y-4">{options.filter(o=>['pushNotifications','emailNotifications','soundEffects','reduceMotion'].includes(o.key)).map(o=><label key={o.key} className="flex items-start justify-between gap-4 border-t border-[#dce6d8] pt-4"><span><span className="block text-sm font-bold">{o.title}</span><span className="mt-1 block text-xs leading-5 text-slate-500">{o.description}</span></span><input type="checkbox" checked={Boolean(prefs[o.key])} onChange={e=>update(o.key,e.target.checked)} className="mt-1 h-4 w-4 accent-[#286747]"/></label>)}</div><label className="mt-5 block text-sm font-bold">Jazyk rozhraní<select value={prefs.language} onChange={e=>update('language',e.target.value)} className="mt-2 w-full rounded-xl border bg-white/70 p-3 font-normal"><option value="cs">Čeština</option><option value="en">English (připravované)</option><option value="sk">Slovenčina (připravované)</option></select></label></section>
 <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p role="status" className="text-sm font-semibold text-[#477353]">{notice || (saved?'Nastavení je uloženo v tomto prohlížeči.':'')}</p><button onClick={save} className="rounded-xl bg-[#24563b] px-6 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/10 transition hover:bg-[#174b35]">Uložit nastavení</button></div>
 <p className="mt-6 text-xs leading-5 text-slate-500">Důležité: viditelnost profilu, příběhů a polohy se zde ukládá jako preference účtu. Dokud není daná volba propojena s konkrétní částí aplikace a databázovými pravidly, sama o sobě nezaručuje skrytí údajů ostatním.</p>
 </main>
}
