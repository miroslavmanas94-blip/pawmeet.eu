'use client'

import { useState } from 'react'
import Link from 'next/link'
import { BookOpen, ExternalLink, Search } from 'lucide-react'

const articles = [
  { id:'positive-training', category:'Trénink', title:'Jak začít s tréninkem založeným na odměnách', read:'5 minut', summary:'Rozděl úkol na malé kroky, odměňuj chování, které chceš posílit, a postupuj tempem, které pes zvládá.', content:'Začni v prostředí s malým množstvím rušivých podnětů. Vyber odměnu, která má pro tvého psa hodnotu, a odměňuj přesně to chování, které chceš posílit. Trénuj krátce, dělej přestávky a zvyšuj obtížnost postupně. Pokud pes opakovaně selhává, zjednoduš úkol nebo změň prostředí místo přidávání tlaku.', source:'https://avsab.org/resources/position-statements/' },
  { id:'recall', category:'Každodenní život', title:'Přivolání se buduje postupně', read:'4 minuty', summary:'Spolehlivé přivolání nevznikne jedním povelem. Potřebuje bezpečný nácvik, dobré odměny a postupné přidávání rušivých vlivů.', content:'Začni doma nebo na klidném oploceném místě. Řekni jméno psa a zvolený povel jednou, odměň příchod a znovu mu dovol vrátit se k bezpečné aktivitě. Postupně přidávej vzdálenost a rušivé podněty. Venku používej dlouhé vodítko, dokud si nejsi jistý, že pes přichází spolehlivě. Povel neopakuj mnohokrát za sebou a nikdy psa netrestej za to, že nakonec přišel.', source:'https://www.bluecross.org.uk/advice/dog/training-and-behaviour/recall-training-for-dogs' },
  { id:'socialization', category:'Štěňata', title:'Socializace není povinnost pozdravit každého', read:'4 minuty', summary:'Cílem je bezpečné poznávání světa, ne nucený kontakt se všemi lidmi a psy.', content:'Dovol štěněti pozorovat nové situace z takové vzdálenosti, na které zůstává uvolněné a dokáže přijímat odměny. Krátká pozitivní zkušenost je cennější než dlouhé vystavení stresu. Nech ho mít možnost odejít, respektuj signály nepohody a seznamování plánuj s ohledem na očkování a doporučení veterináře.', source:'https://www.rspca.org.uk/adviceandwelfare/pets/dogs/training' },
  { id:'heat', category:'Zdraví a bezpečí', title:'Bezpečí psa v horkém počasí', read:'3 minuty', summary:'Pohyb přizpůsob teplotě, zajisti stín a vodu a ber změny dýchání nebo chování vážně.', content:'V horku plánuj procházky na chladnější části dne a omez intenzivní zátěž. Pes musí mít přístup k vodě a stínu. Silné zrychlené dýchání, slabost, zvracení, dezorientace nebo kolaps mohou znamenat akutní problém. Při podezření na přehřátí začni šetrně chladit a ihned kontaktuj veterinární pohotovost. Nenechávej psa samotného v zaparkovaném autě.', source:'https://www.rspca.org.uk/adviceandwelfare/pets/dogs/health/heatstroke' },
]

export default function ArticlesPage() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState<string | null>(null)
  const filtered = articles.filter(article => (article.title + ' ' + article.summary + ' ' + article.category).toLocaleLowerCase('cs-CZ').includes(query.toLocaleLowerCase('cs-CZ')))
  return (
    <main className="mx-auto min-h-screen max-w-5xl px-4 py-8 pb-28 text-[var(--pm-forest)] sm:px-8">
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-[var(--pm-accent)]"><BookOpen size={16}/> Články a poradna</div>
      <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">Praktické rady pro společný život.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--pm-muted)]">Krátké průvodce pro trénink, každodenní situace a bezpečí. Jde o obecné informace, ne individuální diagnózu nebo náhradu veterinární péče.</p>
      <label className="relative mt-6 block max-w-xl"><span className="sr-only">Hledat článek</span><Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--pm-muted)]"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Hledat téma…" className="w-full rounded-xl border border-[var(--pm-line)] bg-[var(--pm-card)] py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--pm-accent)]"/></label>
      <div className="mt-6 grid gap-4 md:grid-cols-2">{filtered.map(article=><article key={article.id} className="pawmeet-glass rounded-2xl p-5 sm:p-6"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[var(--pm-accent)]">{article.category} · {article.read}</p><h2 className="mt-2 text-xl font-bold">{article.title}</h2><p className="mt-3 text-sm leading-6 text-[var(--pm-muted)]">{article.summary}</p>{active===article.id && <div className="mt-4 border-t border-[var(--pm-line)] pt-4"><p className="text-sm leading-7">{article.content}</p><a href={article.source} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--pm-accent)] hover:underline">Odborný zdroj <ExternalLink size={13}/></a></div>}<button type="button" onClick={()=>setActive(active===article.id?null:article.id)} className="mt-4 rounded-xl border border-[var(--pm-line)] px-4 py-2.5 text-xs font-semibold hover:bg-[var(--pm-hover)]">{active===article.id?'Skrýt článek':'Číst článek'}</button></article>)}</div>
      {!filtered.length && <p className="pawmeet-glass mt-5 rounded-2xl p-8 text-center text-sm text-[var(--pm-muted)]">Tomuto hledání neodpovídá žádný článek.</p>}
    </main>
  )
}
