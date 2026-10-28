'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Certificate = { id: string; recipient_id: string; title: string; certificate_type: string; course_id: string | null; score: number | null; issued_at: string; issued_by: string | null }
type Profile = { id: string; username: string | null; display_name: string | null; full_name: string | null; role: string | null }

const supabase = createClient()
const typeLabel: Record<string, string> = { course_completion: 'Dokončený kurz', trainer_issued: 'Vystavil trenér', admin_issued: 'Vystavil administrátor' }

export default function CertificatesPage() {
  const [userId, setUserId] = useState('')
  const [role, setRole] = useState('')
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [recipientId, setRecipientId] = useState('')
  const [title, setTitle] = useState('')
  const [courseId, setCourseId] = useState('')
  const [score, setScore] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const canIssue = ['admin','administrator','trainer','trenér'].includes(role.toLowerCase())

  const load = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setNotice('Pro zobrazení certifikátů se přihlas.'); return }
      setUserId(user.id)
      const { data: ownProfile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      setRole(ownProfile?.role || '')
      const { data, error } = await supabase.from('certificates').select('*').order('issued_at', { ascending: false })
      if (error) throw error
      setCertificates((data || []) as Certificate[])
      if (['admin','administrator','trainer','trenér'].includes(String(ownProfile?.role || '').toLowerCase())) {
        const { data: people } = await supabase.from('profiles').select('id,username,display_name,full_name,role').order('display_name').limit(500)
        setProfiles((people || []) as Profile[])
      }
    } catch (error) {
      console.error('Načtení certifikátů selhalo:', error)
      setNotice('Certifikáty se nepodařilo načíst.')
    } finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  const issue = async (event: FormEvent) => {
    event.preventDefault()
    if (!canIssue || !recipientId || !title.trim()) return
    setSaving(true); setNotice('')
    try {
      const kind = role.toLowerCase() === 'admin' || role.toLowerCase() === 'administrator' ? 'admin_issued' : 'trainer_issued'
      const numericScore = score.trim() ? Number(score) : null
      if (numericScore !== null && (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100)) {
        setNotice('Výsledek musí být číslo od 0 do 100.'); return
      }
      const { error } = await supabase.from('certificates').insert({
        recipient_id: recipientId, title: title.trim(), course_id: courseId.trim() || null,
        certificate_type: kind, issued_by: userId, score: numericScore
      })
      if (error) throw error
      setTitle(''); setCourseId(''); setScore('')
      setNotice('Certifikát byl vystaven.')
      await load()
    } catch (error) {
      console.error('Vystavení certifikátu selhalo:', error)
      setNotice('Certifikát se nepodařilo vystavit. Zkontroluj oprávnění a roli účtu.')
    } finally { setSaving(false) }
  }

  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
    <Link href="/profile" className="text-sm font-semibold text-[var(--pm-green)] hover:underline">← Zpět na profil</Link>
    <header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">PawMeet · Akademie</p><h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Certifikáty</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Přehled získaných ocenění. Trenéři a administrátoři mohou vystavovat certifikáty oprávněným způsobem.</p></header>
    {notice && <p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm">{notice}</p>}
    {canIssue && <section className="mt-6 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5"><h2 className="text-lg font-semibold">Vystavit certifikát</h2><form onSubmit={issue} className="mt-4 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">Příjemce<select required value={recipientId} onChange={e=>setRecipientId(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3"><option value="">Vyber uživatele</option>{profiles.filter(p=>p.id!==userId).map(p=><option key={p.id} value={p.id}>{p.display_name||p.full_name||p.username||p.id}</option>)}</select></label>
      <label className="text-sm font-medium">Název certifikátu<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3"/></label>
      <label className="text-sm font-medium">ID kurzu (volitelné)<input maxLength={120} value={courseId} onChange={e=>setCourseId(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3"/></label>
      <label className="text-sm font-medium">Výsledek testu (%)<input type="number" min="0" max="100" step="0.1" value={score} onChange={e=>setScore(e.target.value)} className="mt-1.5 w-full rounded-xl border bg-transparent p-3"/></label>
      <button disabled={saving||!recipientId||!title.trim()} className="self-end rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{saving?'Vystavuji…':'Vystavit certifikát'}</button>
    </form></section>}
    <section className="mt-8"><h2 className="text-lg font-semibold">Moje certifikáty</h2>{loading?<p className="mt-4 text-sm text-[var(--pm-muted)]">Načítám…</p>:certificates.length===0?<p className="mt-4 rounded-2xl border border-dashed border-[var(--pm-line)] p-6 text-sm text-[var(--pm-muted)]">Zatím nemáš žádné certifikáty.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{certificates.filter(c=>c.recipient_id===userId||canIssue).map(c=><article key={c.id} className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4"><p className="text-xs text-[var(--pm-muted)]">{typeLabel[c.certificate_type]||c.certificate_type}</p><h3 className="mt-1 font-semibold">{c.title}</h3><p className="mt-2 text-sm text-[var(--pm-muted)]">Vystaveno {new Date(c.issued_at).toLocaleDateString('cs-CZ')}{c.score!==null?' · Výsledek '+c.score+'%':''}</p>{c.course_id&&<p className="mt-1 text-xs text-[var(--pm-muted)]">Kurz: {c.course_id}</p>}</article>)}</div>}</section>
    <p className="mt-6 text-xs leading-5 text-[var(--pm-muted)]">Automatické certifikáty po splnění kurzu a testu vyžadují napojení na evidenci kurzů a ověřených výsledků. Tato stránka nyní podporuje bezpečné vystavení trenérem nebo administrátorem.</p>
  </main>
}
