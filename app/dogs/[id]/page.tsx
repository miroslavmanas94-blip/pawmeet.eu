'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

type Pet = {
  id: string
  user_id: string
  name: string | null
  type: string | null
  breed: string | null
  birth_date: string | null
  gender: string | null
  size: string | null
  nature: string | null
  activities: string | null
}
type Owner = { id: string; username?: string | null; display_name?: string | null; full_name?: string | null; avatar_url?: string | null }

export default function DogProfilePage() {
  const params = useParams<{ id: string }>()
  const [pet, setPet] = useState<Pet | null>(null)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data, error: petError } = await supabase.from('pets').select('id,user_id,name,type,breed,birth_date,gender,size,nature,activities').eq('id', params.id).maybeSingle()
      if (cancelled) return
      if (petError || !data) {
        setError('Psí profil se nepodařilo najít.')
        setLoading(false)
        return
      }
      setPet(data as Pet)
      const { data: ownerData } = await supabase.from('profiles').select('id,username,display_name,full_name,avatar_url').eq('id', data.user_id).maybeSingle()
      if (!cancelled) {
        setOwner(ownerData as Owner | null)
        setLoading(false)
      }
    }
    if (params.id) void load()
    return () => { cancelled = true }
  }, [params.id])

  const ownerName = owner?.display_name || owner?.full_name || (owner?.username && !owner.username.startsWith('user_') ? owner.username : 'Pejskař')
  const facts = pet ? [
    ['Plemeno', pet.breed],
    ['Typ', pet.type],
    ['Pohlaví', pet.gender],
    ['Velikost', pet.size],
    ['Datum narození', pet.birth_date ? new Date(pet.birth_date + 'T12:00:00').toLocaleDateString('cs-CZ') : null],
    ['Povaha', pet.nature],
    ['Aktivity a sporty', pet.activities]
  ].filter((item): item is [string, string] => Boolean(item[1] && item[1].trim())) : []

  return <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 pb-28 text-[#183d2c] md:px-8">
    <Link href="/search" className="text-sm font-bold text-[#477353] hover:underline">← Zpět na hledání</Link>
    {loading ? <div className="pawmeet-glass mt-6 animate-pulse rounded-3xl p-8"><div className="h-8 w-48 rounded bg-[#dcebd7]" /><div className="mt-4 h-4 w-72 rounded bg-[#e8f0e3]" /></div> : error || !pet ? <section className="pawmeet-glass mt-6 rounded-3xl p-8"><h1 className="text-2xl font-black text-[#174b35]">Psí profil není dostupný</h1><p className="mt-2 text-sm text-slate-600">{error || 'Záznam nebyl nalezen.'}</p></section> : <>
      <section className="pawmeet-glass mt-6 overflow-hidden rounded-[2rem]">
        <div className="bg-gradient-to-br from-[#dcebd7] via-[#edf4e6] to-[#f8f5e9] px-6 py-10 md:px-10">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/80 bg-white/75 text-4xl shadow-sm" aria-hidden="true">🐾</div>
          <p className="mt-6 text-xs font-bold uppercase tracking-[.2em] text-[#66816a]">Psí profil PawMeet</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight text-[#174b35]">{pet.name || 'Pes bez jména'}</h1>
          <p className="mt-2 text-base font-semibold text-[#477353]">{pet.breed || pet.type || 'Psí parťák'}</p>
          <p className="mt-5 max-w-2xl text-sm leading-6 text-slate-600">Profil psího parťáka a jeho aktivit v komunitě PawMeet.</p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-2 md:p-7">
          {facts.map(([label, value]) => <div key={label} className="rounded-2xl border border-[#dce6d8] bg-white/65 p-4"><p className="text-xs font-bold uppercase tracking-wide text-[#66816a]">{label}</p><p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-[#174b35]">{value}</p></div>)}
        </div>
      </section>
      {owner && <Link href={'/profile/' + (owner.username || owner.id)} className="pawmeet-glass mt-4 flex items-center gap-3 rounded-2xl p-4 transition hover:shadow-md">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#e8f0e3]">{owner.avatar_url ? <img src={owner.avatar_url} alt="" className="h-full w-full object-cover" /> : <span className="font-bold text-[#24563b]">{ownerName.slice(0,1).toUpperCase()}</span>}</div>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-wide text-[#66816a]">Majitel / majitelka</p><p className="truncate text-sm font-extrabold text-[#174b35]">{ownerName}</p>{owner.username && !owner.username.startsWith('user_') && <p className="text-xs text-slate-500">@{owner.username}</p>}</div><span className="text-xs font-bold text-[#477353]">Profil →</span>
      </Link>}
    </>}
  </main>
}
