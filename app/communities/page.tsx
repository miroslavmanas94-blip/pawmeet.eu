'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { LockKeyhole, UsersRound, Plus, Compass, LoaderCircle, ShieldCheck } from 'lucide-react'

type CommunityGroup = {
  id: string
  name: string | null
  avatar_url: string | null
  is_public: boolean | null
  is_private: boolean | null
  created_by: string | null
  created_at: string | null
}

export default function CommunitiesPage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<CommunityGroup[]>([])
  const [membershipIds, setMembershipIds] = useState<string[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [filter, setFilter] = useState<'all' | 'joined' | 'mine'>('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: authData } = await supabase.auth.getUser()
    const currentUserId = authData.user?.id ?? null
    setUserId(currentUserId)

    const { data: groupData, error: groupError } = await supabase
      .from('groups')
      .select('id, name, avatar_url, is_public, is_private, created_by, created_at')
      .order('created_at', { ascending: false })
      .limit(100)

    if (groupError) {
      setError('Komunity se nepodařilo načíst. Zkontroluj připojení a oprávnění účtu.')
      setGroups([])
    } else {
      setGroups((groupData || []) as CommunityGroup[])
    }

    if (currentUserId) {
      const { data: memberships, error: membershipError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUserId)
      if (!membershipError) setMembershipIds((memberships || []).map((item: { group_id: string }) => item.group_id))
    } else {
      setMembershipIds([])
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { void load() }, [load])

  const createGroup = async (event: FormEvent) => {
    event.preventDefault()
    if (!userId || !name.trim() || saving) return
    setSaving(true)
    setError('')
    setNotice('')
    const { data: group, error: createError } = await supabase
      .from('groups')
      .insert({
        name: name.trim().slice(0, 80),
        created_by: userId,
        is_private: isPrivate,
        is_public: !isPrivate,
      })
      .select('id')
      .single()

    if (createError || !group) {
      setError(createError?.message || 'Komunitu se nepodařilo vytvořit.')
      setSaving(false)
      return
    }

    const { error: joinError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'owner',
    })
    if (joinError) {
      setNotice('Komunita vznikla, ale nepodařilo se potvrdit členství. Obnov stránku a zkus to znovu.')
    } else {
      setNotice(isPrivate ? 'Soukromá komunita byla vytvořena. Zatím je přístupná pouze jejímu zakladateli.' : 'Veřejná komunita byla vytvořena.')
    }
    setName('')
    setShowCreate(false)
    setSaving(false)
    await load()
  }

  const joinGroup = async (group: CommunityGroup) => {
    if (!userId) {
      window.location.assign('/login?next=%2Fcommunities')
      return
    }
    if (saving) return
    setSaving(true)
    setError('')
    setNotice('')
    const { error: joinError } = await supabase.from('group_members').insert({
      group_id: group.id,
      user_id: userId,
      role: 'member',
    })
    if (joinError) setError('Připojení se nezdařilo. Možná už jsi členem této komunity.')
    else setNotice(`Připojil/a ses ke komunitě „${group.name || 'bez názvu'}“.`)
    setSaving(false)
    await load()
  }

  const leaveGroup = async (group: CommunityGroup) => {
    if (!userId || saving || group.created_by === userId) return
    setSaving(true)
    setError('')
    setNotice('')
    const { error: leaveError } = await supabase.from('group_members').delete().eq('group_id', group.id).eq('user_id', userId)
    if (leaveError) setError('Komunitu se nepodařilo opustit.')
    else setNotice(`Opustil/a ses komunitu „${group.name || 'bez názvu'}“.`)
    setSaving(false)
    await load()
  }

  const visibleGroups = groups.filter(group => {
    const joined = membershipIds.includes(group.id)
    if (filter === 'joined') return joined
    if (filter === 'mine') return group.created_by === userId
    return true
  })

  return (
    <main className="min-h-screen bg-[var(--pm-canvas)] px-4 py-7 text-[var(--pm-forest)] sm:px-7 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--pm-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--pm-muted)]"><Compass size={15}/> Komunita PawMeet</div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Lidé, kteří rozumí tvému parťákovi.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Najdi komunitu podle zájmů nebo vytvoř vlastní prostor. Veřejné skupiny můžeš procházet, soukromé zůstávají viditelné jen jejich členům a zakladateli.</p>
          </div>
          <button type="button" onClick={() => setShowCreate(value => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#286747] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1e5037]"><Plus size={17}/> Vytvořit komunitu</button>
        </header>

        {showCreate && <form onSubmit={createGroup} className="mb-7 grid gap-4 rounded-2xl border border-[var(--pm-line)] bg-white p-5 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="community-name" className="mb-2 block text-sm font-semibold">Název komunity</label>
            <input id="community-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} required placeholder="Např. Agility v Brně" className="min-h-11 w-full rounded-xl border border-[var(--pm-line)] bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#8fb58a]"/>
            <label className="mt-3 flex cursor-pointer items-start gap-3 text-sm">
              <input type="checkbox" checked={isPrivate} onChange={event => setIsPrivate(event.target.checked)} className="mt-0.5 accent-[#286747]"/>
              <span><strong className="flex items-center gap-1.5">{isPrivate ? <LockKeyhole size={15}/> : <UsersRound size={15}/>} Soukromá komunita</strong><span className="mt-1 block text-xs text-[var(--pm-muted)]">Soukromé komunity nejsou veřejně procházetelné. Členy může přidávat zakladatel.</span></span>
            </label>
          </div>
          <button type="submit" disabled={saving || !userId || !name.trim()} className="min-h-11 rounded-xl bg-[#286747] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Vytvářím…' : 'Vytvořit'}</button>
          {!userId && <p className="text-xs text-[var(--pm-muted)] sm:col-span-2">Pro vytvoření komunity se nejdřív <Link className="font-semibold underline" href="/login?next=%2Fcommunities">přihlas</Link>.</p>}
        </form>}

        {error && <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="mb-4 rounded-xl border border-[#d4e3ce] bg-[#edf4e9] p-3 text-sm text-[#286747]">{notice}</p>}

        <div className="mb-5 flex flex-wrap gap-2" aria-label="Filtrovat komunity">
          {([{id:'all',label:'Objevovat'}, {id:'joined',label:'Moje členství'}, {id:'mine',label:'Moje komunity'}] as const).map(item => <button key={item.id} type="button" onClick={() => setFilter(item.id)} className={`min-h-10 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${filter === item.id ? 'border-[#286747] bg-[#286747] text-white' : 'border-[var(--pm-line)] bg-white text-[var(--pm-muted)] hover:bg-[#edf4e9]'}`}>{item.label}</button>)}
        </div>

        {loading ? <div className="flex items-center justify-center gap-2 py-20 text-sm text-[var(--pm-muted)]"><LoaderCircle className="animate-spin" size={18}/> Načítám komunity…</div> :
          visibleGroups.length === 0 ? <section className="rounded-2xl border border-dashed border-[var(--pm-line)] bg-white/70 px-5 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#edf4e9] text-[#286747]"><UsersRound size={22}/></div>
            <h2 className="text-lg font-semibold">{filter === 'joined' ? 'Zatím nejsi členem žádné komunity' : filter === 'mine' ? 'Zatím jsi žádnou komunitu nevytvořil/a' : 'Zatím tu nejsou žádné komunity'}</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-[var(--pm-muted)]">Vytvoř první komunitu nebo se vrať později. Nezobrazujeme ukázkové ani vymyšlené skupiny.</p>
            <button type="button" onClick={() => setShowCreate(true)} className="mt-5 rounded-xl bg-[#286747] px-4 py-3 text-sm font-semibold text-white">Vytvořit první komunitu</button>
          </section> :
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {visibleGroups.map(group => {
              const joined = membershipIds.includes(group.id)
              const owner = group.created_by === userId
              const privateGroup = Boolean(group.is_private)
              return <article key={group.id} className="rounded-2xl border border-[var(--pm-line)] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#edf4e9] text-[#286747]">{privateGroup ? <LockKeyhole size={20}/> : <UsersRound size={20}/>}</div>
                  <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${privateGroup ? 'bg-amber-50 text-amber-800' : 'bg-[#edf4e9] text-[#286747]'}`}>{privateGroup ? 'Soukromá' : 'Veřejná'}</span>
                </div>
                <h2 className="text-lg font-bold">{group.name || 'Komunita bez názvu'}</h2>
                <p className="mt-1 text-xs text-[var(--pm-muted)]">{group.created_at ? `Vytvořeno ${new Date(group.created_at).toLocaleDateString('cs-CZ')}` : 'Komunita PawMeet'}</p>
                <div className="mt-5 flex items-center justify-between gap-3">
                  {owner ? <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#286747]"><ShieldCheck size={15}/> Zakladatel</span> : joined ? <span className="text-xs font-semibold text-[#286747]">Jsi členem</span> : privateGroup ? <span className="text-xs text-[var(--pm-muted)]">Pouze pro členy</span> : <span className="text-xs text-[var(--pm-muted)]">Otevřená skupina</span>}
                  {owner ? <span className="text-xs text-[var(--pm-muted)]">Spravuješ</span> : joined ? <button type="button" disabled={saving} onClick={() => void leaveGroup(group)} className="min-h-10 rounded-lg border border-[var(--pm-line)] px-3 py-2 text-xs font-semibold hover:bg-[#f7f9f5] disabled:opacity-50">Opustit</button> : !privateGroup && <button type="button" disabled={saving} onClick={() => void joinGroup(group)} className="min-h-10 rounded-lg bg-[#286747] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Připojit se</button>}
                </div>
              </article>
            })}
          </div>
        }

        <p className="mt-8 text-xs leading-5 text-[var(--pm-muted)]">Soukromé skupiny nejsou veřejně zobrazovány. Přístup do nich musí udělit jejich zakladatel. Sdílení aktuální polohy není pro členství v komunitách potřeba.</p>
      </div>
    </main>
  )
}
