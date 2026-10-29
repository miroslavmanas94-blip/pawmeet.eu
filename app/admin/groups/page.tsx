'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Check, X, ShieldCheck, LoaderCircle, UsersRound } from 'lucide-react'

type PendingGroup = {
  id: string
  name: string | null
  description: string | null
  is_private: boolean | null
  group_type: string
  approval_status: string
  created_at: string | null
  created_by: string | null
}

export default function AdminGroupsPage() {
  const [items, setItems] = useState<PendingGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Pro přístup se přihlas.')
      setLoading(false)
      return
    }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    if (profile?.role !== 'admin') {
      setIsAdmin(false)
      setError('Tato stránka je dostupná pouze administrátorům.')
      setLoading(false)
      return
    }
    setIsAdmin(true)
    const { data, error: queryError } = await supabase.from('groups')
      .select('id, name, description, is_private, group_type, approval_status, created_at, created_by')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100)
    if (queryError) {
      setError('Čekající komunity se nepodařilo načíst.')
      setItems([])
    } else {
      setItems((data || []) as PendingGroup[])
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const review = async (groupId: string, action: 'approve' | 'reject') => {
    if (busyId) return
    setBusyId(groupId)
    setError('')
    setNotice('')
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error('Přihlášení vypršelo. Přihlas se znovu.')
      const response = await fetch('/api/groups/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
        body: JSON.stringify({ groupId, action }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || 'Komunitu se nepodařilo zpracovat.')
      setNotice(action === 'approve' ? 'Komunita byla schválena a může se zobrazit členům.' : 'Komunita byla zamítnuta.')
      await load()
    } catch (err: any) {
      setError(err?.message || 'Komunitu se nepodařilo zpracovat.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
      <Link href="/profile" className="text-sm font-semibold text-[var(--pm-accent)] hover:underline">← Zpět na profil</Link>
      <div className="mt-6 flex items-start gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--pm-active)] text-[var(--pm-accent)]"><ShieldCheck size={22} /></div>
        <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[var(--pm-muted)]">Moderace</p><h1 className="mt-1 text-3xl font-bold">Schvalování komunit</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Nové komunity zůstávají skryté ostatním, dokud je administrátor neschválí.</p></div>
      </div>
      {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-active)] p-3 text-sm">{notice}</p>}
      {loading ? <div className="flex items-center gap-2 py-16 text-sm text-[var(--pm-muted)]"><LoaderCircle className="animate-spin" size={18}/> Načítám žádosti…</div>
      : isAdmin && (items.length ? <div className="mt-6 grid gap-4">{items.map(group => <article key={group.id} className="pawmeet-glass rounded-2xl p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0"><div className="flex items-center gap-2"><UsersRound size={18} className="text-[var(--pm-accent)]"/><h2 className="text-lg font-bold">{group.name || 'Komunita bez názvu'}</h2></div><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">{group.description || 'Bez popisu.'}</p><p className="mt-2 text-xs text-[var(--pm-muted)]">{group.is_private ? 'Soukromá komunita' : 'Veřejná komunita'} · {group.created_at ? new Date(group.created_at).toLocaleString('cs-CZ') : 'Datum neuvedeno'}</p><p className="mt-1 break-all text-[11px] text-[var(--pm-muted)]">ID zakladatele: {group.created_by || 'neuvedeno'}</p></div>
          <div className="flex shrink-0 gap-2"><button type="button" disabled={busyId === group.id} onClick={() => void review(group.id, 'approve')} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--pm-accent)] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"><Check size={16}/> Schválit</button><button type="button" disabled={busyId === group.id} onClick={() => void review(group.id, 'reject')} className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-4 py-2.5 text-sm font-semibold text-rose-700 disabled:opacity-50"><X size={16}/> Zamítnout</button></div>
        </div>
      </article>)}</div> : <div className="pawmeet-glass mt-6 rounded-2xl p-8 text-center"><h2 className="font-bold">Žádné čekající komunity</h2><p className="mt-2 text-sm text-[var(--pm-muted)]">Až někdo navrhne novou komunitu, objeví se zde.</p></div>)}
    </main>
  )
}
