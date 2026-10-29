import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10 pb-28 text-[var(--pm-forest)] sm:px-8">
      <Link href="/" className="text-sm font-semibold text-[var(--pm-accent)] hover:underline">← Úvodní stránka</Link>
      <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--pm-active)] text-[var(--pm-accent)]"><ShieldCheck size={23}/></div>
      <h1 className="mt-5 text-4xl font-bold tracking-tight">Ochrana soukromí</h1>
      <p className="mt-3 text-sm text-[var(--pm-muted)]">Pracovní znění pro PawMeet.eu · aktualizováno 29. října 2026</p>
      <div className="mt-7 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Důležité:</strong> Před ostrým komerčním provozem je nutné doplnit a právně ověřit úplné identifikační údaje provozovatele, smluvní informace o zpracovatelích a závazné lhůty uchování. Tento text není právní stanovisko.</div>
      <div className="pawmeet-glass mt-6 space-y-7 rounded-2xl p-6 sm:p-8">
        <section><h2 className="text-lg font-bold">1. Jaké údaje můžeš přidat</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">PawMeet může zpracovávat údaje, které vložíš do účtu a profilů: e-mail, přezdívku, profilovou fotografii, město, informace o psech, příspěvky, zprávy, registrace na akce, tréninkové záznamy a nastavení soukromí. Rozsah závisí na tom, které funkce používáš.</p></section>
        <section><h2 className="text-lg font-bold">2. Účel použití</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Údaje slouží k přihlášení, zobrazení profilů podle nastavení, fungování chatu a komunit, správě akcí, tréninkových funkcí, zabezpečení a odpovědím na podporu. Údaje nesmí být použity k jiným účelům, které uživateli nebyly srozumitelně sděleny.</p></section>
        <section><h2 className="text-lg font-bold">3. Profily a veřejný obsah</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Profil je při založení nastaven jako veřejný, ale můžeš ho přepnout na soukromý a řídit viditelnost jednotlivých částí. Veřejné příspěvky a veřejné profily může vidět širší publikum. Nezveřejňuj hesla, citlivé dokumenty ani údaje jiných lidí bez oprávnění.</p></section>
        <section><h2 className="text-lg font-bold">4. Poloha</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Sdílení polohy má být ve výchozím stavu vypnuté. Před zapnutím si zvolíš publikum, přesnost a dobu sdílení. Přibližná poloha se zaokrouhluje a nezobrazuje přesnou adresu; přesná poloha se sdílí jen zvolenému publiku. Sdílení můžeš kdykoli vypnout.</p></section>
        <section><h2 className="text-lg font-bold">5. Zprávy, AI a paměť</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Soukromé zprávy nejsou určeny k veřejnému zobrazení. AI paměť má být volitelná a spravovatelná uživatelem. Do AI nevkládej hesla ani údaje, které nejsou potřebné pro tvůj dotaz. AI odpovědi, zejména zdravotní, nenahrazují odborné posouzení veterináře.</p></section>
        <section><h2 className="text-lg font-bold">6. Zabezpečení a uchování</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">PawMeet má používat přístupová pravidla, která omezují čtení a změny podle role a nastavení soukromí. Historii můžeš spravovat v dostupných funkcích účtu. Některé bezpečnostní a provozní záznamy mohou být uchovány po nezbytnou dobu; konkrétní lhůty musí být doplněny do finální verze zásad.</p></section>
        <section><h2 className="text-lg font-bold">7. Tvoje možnosti</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Můžeš upravit údaje, změnit viditelnost profilu, vypnout sdílení polohy, spravovat paměť AI a požádat o deaktivaci nebo odstranění účtu. Odstranění může podléhat zákonným povinnostem a oprávněným bezpečnostním potřebám.</p></section>
        <section><h2 className="text-lg font-bold">8. Kontakt</h2><p className="mt-2 text-sm leading-6 text-[var(--pm-muted)]">Dotazy k soukromí můžeš poslat přes <Link href="/contact" className="font-semibold text-[var(--pm-accent)] hover:underline">kontaktní formulář</Link> nebo na <a href="mailto:pawmeet.eu@gmail.com" className="font-semibold text-[var(--pm-accent)] hover:underline">pawmeet.eu@gmail.com</a>.</p></section>
      </div>
    </main>
  )
}
