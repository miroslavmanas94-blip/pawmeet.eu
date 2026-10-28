'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

type Track = { id: string; title: string; artist: string | null; provider: string; provider_track_id: string | null; license_name: string; license_url: string; permitted_use: string; attribution: string | null; preview_url: string | null; track_url: string; is_active: boolean; created_at: string }
const supabase = createClient()
const httpsUrl = (value: string) => { try { return new URL(value).protocol === 'https:' } catch { return false } }

export default function AudioCatalogPage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [userId, setUserId] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState('')
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [provider, setProvider] = useState('')
  const [providerTrackId, setProviderTrackId] = useState('')
  const [licenseName, setLicenseName] = useState('')
  const [licenseUrl, setLicenseUrl] = useState('')
  const [trackUrl, setTrackUrl] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [permittedUse, setPermittedUse] = useState('social_video')
  const [attribution, setAttribution] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUserId(user?.id || '')
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
        setIsAdmin(['admin','administrator'].includes(String(profile?.role || '').toLowerCase()))
      } else setIsAdmin(false)
      const { data, error } = await supabase.from('licensed_audio_tracks').select('*').order('title')
      if (error) throw error
      setTracks((data || []) as Track[])
    } catch (error) {
      console.error('Načtení licencované hudby selhalo:', error)
      setNotice('Hudební katalog se nepodařilo načíst.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load() }, [load])

  const addTrack = async (event: FormEvent) => {
    event.preventDefault()
    if (!isAdmin) return
    if (!title.trim() || !provider.trim() || !licenseName.trim() || !httpsUrl(licenseUrl) || !httpsUrl(trackUrl) || (previewUrl && !httpsUrl(previewUrl))) {
      setNotice('Doplň název, zdroj, licenci a platné HTTPS odkazy.')
      return
    }
    setSaving(true); setNotice('')
    try {
      const { error } = await supabase.from('licensed_audio_tracks').insert({
        title: title.trim(), artist: artist.trim() || null, provider: provider.trim(),
        provider_track_id: providerTrackId.trim() || null, license_name: licenseName.trim(),
        license_url: licenseUrl.trim(), permitted_use: permittedUse,
        attribution: attribution.trim() || null, track_url: trackUrl.trim(),
        preview_url: previewUrl.trim() || null, is_active: true
      })
      if (error) throw error
      setTitle(''); setArtist(''); setProviderTrackId(''); setLicenseName(''); setLicenseUrl(''); setTrackUrl(''); setPreviewUrl(''); setAttribution('')
      setNotice('Skladba byla přidána do katalogu. Před zveřejněním vždy ověř, že licence dovoluje zamýšlené použití.')
      await load()
    } catch (error) {
      console.error('Přidání skladby selhalo:', error)
      setNotice('Skladbu se nepodařilo přidat. Zkontroluj oprávnění, odkazy a případnou duplicitu.')
    } finally { setSaving(false) }
  }

  const toggleTrack = async (track: Track) => {
    if (!isAdmin) return
    const { error } = await supabase.from('licensed_audio_tracks').update({ is_active: !track.is_active }).eq('id', track.id)
    if (error) { setNotice('Stav skladby se nepodařilo změnit.'); return }
    await load()
  }

  return <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] md:px-8">
    <Link href="/domu" className="text-sm font-semibold text-[var(--pm-green)] hover:underline">← Zpět do komunity</Link>
    <header className="mt-6"><p className="text-xs font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">PawMeet · Tvůrčí studio</p><h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">Licencovaná hudba</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--pm-muted)]">Katalog skladby zobrazí až po doplnění ověřitelné licence. Samotné uvedení odkazu neznamená, že licence dovoluje každé použití nebo distribuci.</p></header>
    {notice && <p role="status" className="mt-5 rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-sm">{notice}</p>}
    {isAdmin && <section className="mt-6 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-5 md:p-6"><h2 className="text-lg font-semibold">Správa katalogu</h2><p className="mt-1 text-sm text-[var(--pm-muted)]">Přidávej pouze skladby, u kterých máš ověřené podmínky licence a právo je zpřístupnit.</p>
      <form onSubmit={addTrack} className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">Název skladby<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">Interpret<input maxLength={180} value={artist} onChange={e=>setArtist(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">Poskytovatel / zdroj<input required maxLength={180} value={provider} onChange={e=>setProvider(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">ID skladby u poskytovatele<input maxLength={180} value={providerTrackId} onChange={e=>setProviderTrackId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">Název licence<input required maxLength={180} value={licenseName} onChange={e=>setLicenseName(e.target.value)} placeholder="Např. konkrétní licence poskytovatele" className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">Odkaz na podmínky licence (HTTPS)<input type="url" required value={licenseUrl} onChange={e=>setLicenseUrl(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">Odkaz na skladbu (HTTPS)<input type="url" required value={trackUrl} onChange={e=>setTrackUrl(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">Náhled skladby (volitelné HTTPS)<input type="url" value={previewUrl} onChange={e=>setPreviewUrl(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <label className="text-sm font-medium">Povolené použití<select value={permittedUse} onChange={e=>setPermittedUse(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"><option value="social_video">Video na sociálních sítích</option><option value="personal">Pouze osobní použití</option><option value="commercial">Komerční použití</option><option value="attribution_required">Použití s uvedením autora</option></select></label>
        <label className="text-sm font-medium">Požadované uvedení autora<input maxLength={500} value={attribution} onChange={e=>setAttribution(e.target.value)} className="mt-1.5 w-full rounded-xl border border-[var(--pm-line)] bg-transparent p-3"/></label>
        <button disabled={saving} className="rounded-xl bg-[var(--pm-green)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{saving?'Ukládám…':'Přidat licencovanou skladbu'}</button>
      </form>
    </section>}
    <section className="mt-8"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Dostupné skladby</h2><span className="text-xs text-[var(--pm-muted)]">{tracks.filter(t=>t.is_active).length}</span></div>
      {loading?<p className="mt-4 text-sm text-[var(--pm-muted)]">Načítám…</p>:tracks.filter(t=>t.is_active||isAdmin).length===0?<p className="mt-4 rounded-2xl border border-dashed border-[var(--pm-line)] p-6 text-sm leading-6 text-[var(--pm-muted)]">Katalog zatím nemá ověřené skladby. Nebyla přidána žádná hudba bez potvrzené licence. Jakmile administrátor doplní skladbu, její podmínky se zobrazí zde.</p>:<div className="mt-4 grid gap-3 md:grid-cols-2">{tracks.filter(t=>t.is_active||isAdmin).map(track=><article key={track.id} className="rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{track.title}</h3><p className="mt-1 text-sm text-[var(--pm-muted)]">{track.artist||track.provider}</p></div>{isAdmin&&<button type="button" onClick={()=>void toggleTrack(track)} className="text-xs font-semibold text-[var(--pm-green)]">{track.is_active?'Skrýt':'Zveřejnit'}</button>}</div><p className="mt-3 text-xs text-[var(--pm-muted)]">Zdroj: {track.provider} · Použití: {track.permitted_use.replaceAll('_',' ')}</p><p className="mt-1 text-xs text-[var(--pm-muted)]">Licence: {track.license_name}</p>{track.attribution&&<p className="mt-2 text-xs">{track.attribution}</p>}{track.preview_url&&<audio controls preload="none" className="mt-3 w-full" src={track.preview_url}>Přehrávání zvuku není v tomto prohlížeči podporováno.</audio>}<div className="mt-3 flex flex-wrap gap-3 text-sm"><a href={track.license_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--pm-green)] underline">Podmínky licence</a><a href={track.track_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--pm-green)] underline">Zdroj skladby</a></div></article>)}</div>}
    </section>
  </main>
}
