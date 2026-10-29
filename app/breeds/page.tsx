'use client'

import { useEffect, useState } from 'react'
import { Dog, Search, ExternalLink, Activity, Scissors } from 'lucide-react'

type Breed = { id:string; name:string; api:string; group:string; activity:string; coat:string; summary:string; fci:string }
const breeds: Breed[] = [
  { id:'border-collie', name:'Border kolie', api:'collie/border', group:'Pastevecká plemena', activity:'Velmi vysoká', coat:'Krátká nebo středně dlouhá', summary:'Pracovité a velmi učenlivé plemeno, které obvykle potřebuje pravidelnou práci hlavou i tělem.', fci:'https://www.fci.be/en/nomenclature/BORDER-COLLIE-297.html' },
  { id:'shetland-sheepdog', name:'Šeltie (shetlandský ovčák)', api:'sheepdog/shetland', group:'Pastevecká plemena', activity:'Vysoká', coat:'Dlouhá, vyžaduje péči', summary:'Menší pastevecký pes, kterému prospívá citlivý trénink, přiměřená aktivita a pravidelná péče o srst.', fci:'https://www.fci.be/en/nomenclature/SHETLAND-SHEEPDOG-88.html' },
  { id:'labrador', name:'Labradorský retrívr', api:'labrador', group:'Retrívři', activity:'Vysoká', coat:'Krátká, hustá', summary:'Společenský a aktivní retrívr; důležitý je pravidelný pohyb, zaměstnání a péče o zdravou hmotnost.', fci:'https://www.fci.be/en/nomenclature/LABRADOR-RETRIEVER-122.html' },
  { id:'golden-retriever', name:'Zlatý retrívr', api:'retriever/golden', group:'Retrívři', activity:'Vysoká', coat:'Středně dlouhá', summary:'Aktivní a kontaktní pes, který ocení společnou činnost, výcvik založený na odměnách a péči o srst.', fci:'https://www.fci.be/en/nomenclature/GOLDEN-RETRIEVER-111.html' },
  { id:'german-shepherd', name:'Německý ovčák', api:'germanshepherd', group:'Pastevecká a pracovní plemena', activity:'Vysoká', coat:'Krátká nebo dlouhá', summary:'Pracovní plemeno, kterému prospívá promyšlený trénink, vhodná socializace a pravidelná přiměřená aktivita.', fci:'https://www.fci.be/en/nomenclature/GERMAN-SHEPHERD-DOG-166.html' },
  { id:'poodle', name:'Pudl', api:'poodle', group:'Společenská a vodní plemena', activity:'Střední až vysoká', coat:'Kudrnatá, vyžaduje úpravu', summary:'Chytrý a všestranný pes, který potřebuje mentální zaměstnání a pravidelnou péči o srst.', fci:'https://www.fci.be/en/nomenclature/POODLE-172.html' },
  { id:'beagle', name:'Bígl', api:'beagle', group:'Honiči', activity:'Vysoká', coat:'Krátká', summary:'Pachově orientovaný honič; při tréninku se hodí práce s čichem, bezpečné prostředí a důsledné budování přivolání.', fci:'https://www.fci.be/en/nomenclature/BEAGLE-161.html' },
  { id:'corgi-pembroke', name:'Welsh corgi pembroke', api:'corgi/pembroke', group:'Pastevecká plemena', activity:'Střední až vysoká', coat:'Středně dlouhá', summary:'Malý, aktivní pastevecký pes, který potřebuje zaměstnání, přiměřený pohyb a kontrolu hmotnosti.', fci:'https://www.fci.be/en/nomenclature/WELSH-CORGI-PEMBROKE-39.html' },
  { id:'french-bulldog', name:'Francouzský buldoček', api:'bulldog/french', group:'Společenská plemena', activity:'Nízká až střední', coat:'Krátká', summary:'Společenský pes, u kterého je důležité hlídat přehřátí, dýchání a přizpůsobit pohyb zdravotnímu stavu.', fci:'https://www.fci.be/en/nomenclature/FRENCH-BULLDOG-101.html' },
  { id:'cavalier', name:'Kavalír King Charles španěl', api:'spaniel/cavalier', group:'Společenská plemena', activity:'Střední', coat:'Středně dlouhá', summary:'Kontaktní společenský pes; při výběru chovatele je důležité ověřovat zdravotní vyšetření a rodokmen.', fci:'https://www.fci.be/en/nomenclature/CAVALIER-KING-CHARLES-SPANIEL-136.html' },
]

function BreedImage({ breed }: { breed: Breed }) {
  const [src, setSrc] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    fetch('https://dog.ceo/api/breed/' + breed.api + '/images/random', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('image unavailable')))
      .then(data => { if (typeof data.message === 'string') setSrc(data.message) })
      .catch(() => undefined)
    return () => controller.abort()
  }, [breed.api])
  return src ? <img src={src} alt={breed.name} loading="lazy" className="h-full w-full object-cover"/> : <div className="flex h-full w-full items-center justify-center bg-[var(--pm-active)] text-[var(--pm-accent)]"><Dog size={42}/></div>
}

export default function BreedsPage() {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const groups = Array.from(new Set(breeds.map(breed => breed.group)))
  const filtered = breeds.filter(breed => (group === 'all' || breed.group === group) && (breed.name + ' ' + breed.group + ' ' + breed.summary).toLocaleLowerCase('cs-CZ').includes(query.toLocaleLowerCase('cs-CZ')))

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-8 pb-28 text-[var(--pm-forest)] sm:px-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--pm-accent)]"><Dog size={16}/> Katalog plemen</div>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Poznej psí plemena.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--pm-muted)]">Kurátorovaný výběr plemen s fotografiemi, základními potřebami a odkazem na standard FCI. Potřeby se liší podle konkrétního psa, věku, zdraví a prostředí; obecný profil nenahrazuje individuální posouzení.</p>
      <label className="relative mt-6 block max-w-xl"><span className="sr-only">Hledat plemeno</span><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pm-muted)]"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Hledat plemeno nebo vlastnost…" className="w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--pm-accent)]"/></label>
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2"><button onClick={()=>setGroup('all')} className={'shrink-0 rounded-xl px-3 py-2 text-xs font-semibold '+(group==='all'?'bg-[var(--pm-accent)] text-white':'border border-[var(--pm-line)]')}>Všechna plemena</button>{groups.map(item=><button key={item} onClick={()=>setGroup(item)} className={'shrink-0 rounded-xl px-3 py-2 text-xs font-semibold '+(group===item?'bg-[var(--pm-accent)] text-white':'border border-[var(--pm-line)]')}>{item}</button>)}</div>
      <p className="mt-4 text-xs text-[var(--pm-muted)]">Zobrazeno {filtered.length} z {breeds.length} plemen v tomto výběru. Katalog zatím není úplným seznamem všech uznaných plemen.</p>
      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{filtered.map(breed=><article key={breed.id} className="pawmeet-glass overflow-hidden rounded-2xl"><div className="h-48 overflow-hidden bg-[var(--pm-active)]"><BreedImage breed={breed}/></div><div className="p-5"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--pm-accent)]">{breed.group}</p><h2 className="mt-2 text-xl font-bold">{breed.name}</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">{breed.summary}</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-[var(--pm-hover)] p-3"><Activity size={15} className="text-[var(--pm-accent)]"/><p className="mt-2 text-[10px] font-bold uppercase text-[var(--pm-muted)]">Aktivita</p><p className="mt-1 text-xs font-semibold">{breed.activity}</p></div><div className="rounded-xl bg-[var(--pm-hover)] p-3"><Scissors size={15} className="text-[var(--pm-accent)]"/><p className="mt-2 text-[10px] font-bold uppercase text-[var(--pm-muted)]">Srst</p><p className="mt-1 text-xs font-semibold">{breed.coat}</p></div></div><a href={breed.fci} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--pm-accent)] hover:underline">Standard FCI <ExternalLink size={13}/></a></div></article>)}</div>
      {!filtered.length && <p className="pawmeet-glass mt-5 rounded-2xl p-8 text-center text-sm text-[var(--pm-muted)]">Tomuto hledání neodpovídá žádné plemeno v aktuálním výběru.</p>}
    </main>
  )
}
