import Link from 'next/link'
import { HeartHandshake, MapPinned, GraduationCap, ShieldCheck, UsersRound } from 'lucide-react'

const values = [
  { icon: UsersRound, title: 'Komunita bez bariér', text: 'Prostor pro pejskaře s různými zkušenostmi, zájmy a cíli — od každodenních procházek po psí sporty.' },
  { icon: MapPinned, title: 'Společné chvíle venku', text: 'Hledání parťáků, míst a akcí, které dávají smysl tobě i tvému psovi.' },
  { icon: GraduationCap, title: 'Učení po malých krocích', text: 'Tréninkové záznamy, kurzy a praktické informace pro klidnější soužití.' },
  { icon: ShieldCheck, title: 'Soukromí pod kontrolou', text: 'Nastavení profilu a sdílení polohy mají být srozumitelná a řízená uživatelem.' },
]

export default function AboutPage() {
  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-10 pb-28 text-[var(--pm-forest)] sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[var(--pm-accent)] hover:underline">← Úvodní stránka</Link>
      <section className="mt-6 overflow-hidden rounded-[2rem] border border-[var(--pm-line)] bg-[var(--pm-card)] p-7 sm:p-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-[var(--pm-active)] px-3 py-1.5 text-xs font-bold text-[var(--pm-accent)]"><HeartHandshake size={15}/> O PawMeet.eu</div>
        <h1 className="mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">Spojujeme pejskaře po celé republice.</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--pm-muted)]">PawMeet je místo, kde mohou majitelé psů najít nové parťáky na procházky, sdílet zkušenosti, objevovat akce a plánovat trénink. Chceme, aby technologie pomáhala budovat skutečné vztahy — ne odváděla pozornost od společného života se psem.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Link href="/register" className="rounded-xl bg-[var(--pm-accent)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90">Vytvořit účet</Link><Link href="/calendar" className="rounded-xl border border-[var(--pm-line)] px-5 py-3 text-sm font-semibold hover:bg-[var(--pm-hover)]">Objevovat akce</Link></div>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {values.map(({icon:Icon,title,text}) => <article key={title} className="pawmeet-glass rounded-2xl p-6"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--pm-active)] text-[var(--pm-accent)]"><Icon size={21}/></div><h2 className="mt-4 text-lg font-bold">{title}</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">{text}</p></article>)}
      </section>
      <section className="mt-8 rounded-2xl border border-[var(--pm-line)] p-6"><h2 className="text-xl font-bold">Stav platformy</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--pm-muted)]">PawMeet se průběžně rozvíjí. Dostupnost jednotlivých funkcí se může lišit podle toho, zda je pro danou část připravené bezpečné serverové zpracování. Nezobrazujeme vymyšlené uživatele ani fiktivní akce.</p><Link href="/contact" className="mt-4 inline-flex text-sm font-semibold text-[var(--pm-accent)] hover:underline">Kontaktovat tým PawMeet →</Link></section>
    </main>
  )
}
