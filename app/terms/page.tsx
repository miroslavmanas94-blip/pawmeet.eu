import Link from 'next/link'
import { Scale } from 'lucide-react'

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 pb-28 text-[var(--pm-forest)] sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[var(--pm-accent)] hover:underline">← Úvodní stránka</Link>
      <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--pm-active)] text-[var(--pm-accent)]"><Scale size={23}/></div>
      <h1 className="mt-5 text-4xl font-bold tracking-tight">Pravidla používání PawMeet.eu</h1>
      <p className="mt-3 text-sm text-[var(--pm-muted)]">Pracovní znění · aktualizováno 29. října 2026</p>
      <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Důležité:</strong> Před ostrým komerčním provozem je nutné doplnit údaje provozovatele, pravidla odpovědnosti a případné platební podmínky a nechat text právně ověřit.</div>
      <div className="pawmeet-glass mt-6 space-y-7 rounded-2xl p-6 sm:p-8">
        <section><h2 className="text-lg font-bold">1. Účel platformy</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">PawMeet slouží k propojení pejskařů, správě profilů psů, sdílení zkušeností, organizování akcí a podpoře tréninku. Jednotlivé funkce mohou být postupně zpřístupňovány podle jejich připravenosti.</p></section>
        <section><h2 className="text-lg font-bold">2. Účet a bezpečnost</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Uživatel odpovídá za pravdivost údajů, bezpečné zacházení s přístupem k účtu a činnost provedenou prostřednictvím svého účtu. Nikomu nesděluj heslo. Role trenéra, odborníka, pořadatele nebo administrátora mohou vyžadovat ověření a schválení.</p></section>
        <section><h2 className="text-lg font-bold">3. Chování v komunitě</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Je zakázáno obtěžování, vyhrožování, podvody, spam, zveřejňování cizích osobních údajů bez oprávnění, porušování práv k obsahu a zneužívání funkcí platformy. Respektuj soukromí ostatních uživatelů i bezpečí zvířat.</p></section>
        <section><h2 className="text-lg font-bold">4. Obsah a moderace</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Za svůj obsah odpovídá jeho autor. Obsah může být nahlášen a moderován podle závažnosti. Uživatelé mohou blokovat nebo ztlumit ostatní a proti rozhodnutí moderace požádat o přezkum. Závažné zásahy mají být kontrolovány člověkem.</p></section>
        <section><h2 className="text-lg font-bold">5. Odborné a zdravotní informace</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Obsah akademie, příspěvky a odpovědi AI jsou informativní a nenahrazují veterinární péči ani individuální odborné posouzení. Při varovných zdravotních příznacích kontaktuj veterináře. Trenéři a odborníci musí jednat v mezích své kvalifikace.</p></section>
        <section><h2 className="text-lg font-bold">6. Poloha a setkávání</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Přesnou polohu sdílej jen tehdy, pokud to opravdu chceš, a zkontroluj zvolené publikum i dobu sdílení. Setkávání s ostatními organizuj obezřetně a dbej na bezpečí sebe i svého psa.</p></section>
        <section><h2 className="text-lg font-bold">7. Deaktivace a odstranění účtu</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Účet lze nejprve deaktivovat a následně požádat o odstranění údajů v příslušném zákonném rozsahu. Platforma může dočasně uchovávat údaje, které musí zůstat zachovány ze zákonných nebo oprávněných bezpečnostních důvodů.</p></section>
        <section><h2 className="text-lg font-bold">8. Kontakt</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Dotazy nebo hlášení můžeš poslat přes <Link href="/contact" className="font-semibold text-[var(--pm-accent)] hover:underline">kontaktní formulář</Link>.</p></section>
      </div>
    </main>
  )
}
