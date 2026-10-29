'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, MapPin, Users, MessageCircle, CalendarDays, BookOpen, ShieldCheck, PawPrint, Menu, X, Heart, Compass } from 'lucide-react'

const features = [
  { icon: MapPin, title: 'Místa pro společné procházky', text: 'Objevujte okolí, zajímavá místa a tipy od dalších pejskařů.', href: '/map' },
  { icon: Users, title: 'Pejskaři ve vašem okolí', text: 'Poznávejte lidi, kteří mají rádi psy stejně jako vy.', href: '/community' },
  { icon: MessageCircle, title: 'Domluva bez zmatků', text: 'Mějte prostor pro zprávy a plánování společných setkání.', href: '/messages' },
  { icon: CalendarDays, title: 'Akce a společné venčení', text: 'Najděte událost nebo dejte ostatním vědět, že vyrážíte ven.', href: '/calendar' },
  { icon: BookOpen, title: 'Rady pro každodenní život', text: 'Čtěte články a praktické informace o péči a soužití se psem.', href: '/articles' },
  { icon: ShieldCheck, title: 'Soukromí pod kontrolou', text: 'Rozhodujte sami, co o sobě sdílíte. Poloha se nesdílí automaticky.', href: '/privacy' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="pm-page">
      <header className="pm-header">
        <div className="pm-container pm-header-inner">
          <Link href="/" className="pm-brand" aria-label="PawMeet – domů">
            <span className="pm-logo"><PawPrint size={25} strokeWidth={2.2} /></span>
            <span>PawMeet<span className="pm-brand-dot">.</span></span>
          </Link>
          <button className="pm-menu-toggle" type="button" aria-label={menuOpen ? 'Zavřít nabídku' : 'Otevřít nabídku'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className={`pm-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Hlavní navigace">
            <Link href="/map" onClick={() => setMenuOpen(false)}>Mapa</Link>
            <Link href="/calendar" onClick={() => setMenuOpen(false)}>Akce</Link>
            <Link href="/articles" onClick={() => setMenuOpen(false)}>Poradna</Link>
            <Link href="/about" onClick={() => setMenuOpen(false)}>O PawMeet</Link>
            <div className="pm-nav-actions">
              <Link href="/login" className="pm-login" onClick={() => setMenuOpen(false)}>Přihlásit se</Link>
              <Link href="/register" className="pm-button pm-button-small" onClick={() => setMenuOpen(false)}>Vytvořit účet <ArrowRight size={16} /></Link>
            </div>
          </nav>
        </div>
      </header>

      <section className="pm-hero">
        <div className="pm-container pm-hero-grid">
          <div className="pm-hero-copy">
            <div className="pm-eyebrow"><span className="pm-eyebrow-dot" /> Místo pro českou pejskařskou komunitu</div>
            <h1>Každá procházka může být <span>začátkem přátelství.</span></h1>
            <p className="pm-hero-text">PawMeet propojuje pejskaře, pomáhá objevovat místa na venčení a usnadňuje domlouvání společných procházek. Váš pes nemusí poznávat svět sám — a vy také ne.</p>
            <div className="pm-hero-actions">
              <Link href="/register" className="pm-button">Přidat se k PawMeet <ArrowRight size={18} /></Link>
              <Link href="/map" className="pm-button pm-button-outline"><Compass size={18} /> Prozkoumat možnosti</Link>
            </div>
            <div className="pm-trust-line"><ShieldCheck size={17} /> Vaše soukromí. Vaše pravidla. Vaše tempo.</div>
          </div>
          <div className="pm-hero-art" aria-label="Ilustrace procházky se psem">
            <div className="pm-art-sun" />
            <div className="pm-art-path" />
            <div className="pm-art-hill pm-art-hill-back" />
            <div className="pm-art-hill pm-art-hill-front" />
            <div className="pm-art-card pm-art-card-top"><span className="pm-art-card-icon"><MapPin size={18} /></span><span><strong>Nová místa</strong><small>Blíž k přírodě</small></span></div>
            <div className="pm-dog-illustration"><PawPrint size={76} strokeWidth={1.35} /></div>
            <div className="pm-art-card pm-art-card-bottom"><span className="pm-avatar-stack"><i>A</i><i>M</i><i>K</i></span><span><strong>Procházky ve dvou i ve smečce</strong><small>Začněte jednoduše</small></span></div>
          </div>
        </div>
      </section>

      <section className="pm-intro pm-section">
        <div className="pm-container pm-intro-inner">
          <div><p className="pm-kicker">MÉNĚ HLEDÁNÍ. VÍC SPOLEČNÝCH CHVIL.</p><h2>Pejskařský život je lepší, když na něj nejste sami.</h2></div>
          <p className="pm-intro-text">Někdy hledáte nový park. Jindy parťáka na procházku, inspiraci nebo akci v okolí. PawMeet chce mít tyhle možnosti přehledně na jednom místě — bez složitého ovládání.</p>
        </div>
      </section>

      <section className="pm-section pm-features-section" id="moznosti">
        <div className="pm-container">
          <div className="pm-section-heading"><p className="pm-kicker">CO NA PAWMEET NAJDETE</p><h2>Vše důležité přehledně.</h2><p>Jednoduché prostředí, srozumitelné informace a funkce, které dávají smysl.</p></div>
          <div className="pm-feature-grid">
            {features.map(({ icon: Icon, title, text, href }) => (
              <Link href={href} className="pm-feature-card" key={title}>
                <span className="pm-feature-icon"><Icon size={22} strokeWidth={1.8} /></span>
                <h3>{title}</h3><p>{text}</p><span className="pm-feature-link">Zjistit více <ArrowRight size={15} /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pm-steps-section">
        <div className="pm-container pm-steps-grid">
          <div className="pm-steps-copy"><p className="pm-kicker">ZAČÍT JE JEDNODUCHÉ</p><h2>Nová psí přátelství začínají malým krokem.</h2><p>Nemusíte hned vyplňovat dlouhý profil ani sdílet osobní údaje. Začněte tím, co právě potřebujete.</p><Link href="/register" className="pm-text-link">Vytvořit si účet <ArrowRight size={17} /></Link></div>
          <div className="pm-steps-list">
            <div className="pm-step"><span>01</span><div><h3>Přidejte se</h3><p>Vytvořte si účet a nastavte si profil podle sebe.</p></div></div>
            <div className="pm-step"><span>02</span><div><h3>Prozkoumejte okolí</h3><p>Podívejte se na dostupné možnosti, místa a komunitní obsah.</p></div></div>
            <div className="pm-step"><span>03</span><div><h3>Vyrazte ven</h3><p>Domluvte se s ostatními a užijte si společný čas se svým psem.</p></div></div>
          </div>
        </div>
      </section>

      <section className="pm-cta-section">
        <div className="pm-container"><div className="pm-cta"><div className="pm-cta-mark"><Heart size={25} /></div><p className="pm-kicker">PRO LIDI, KTEŘÍ MAJÍ RÁDI PSY</p><h2>Tak kam vyrazíte příště?</h2><p>Připojte se ke komunitě a udělejte z další procházky příležitost k novému setkání.</p><Link href="/register" className="pm-button pm-button-light">Začít s PawMeet <ArrowRight size={18} /></Link></div></div>
      </section>

      <footer className="pm-footer">
        <div className="pm-container pm-footer-top">
          <div className="pm-footer-brand"><Link href="/" className="pm-brand"><span className="pm-logo"><PawPrint size={23} /></span><span>PawMeet<span className="pm-brand-dot">.</span></span></Link><p>Spojujeme pejskaře po celé republice.</p></div>
          <div className="pm-footer-links"><div><strong>Objevujte</strong><Link href="/map">Mapa pejskařů</Link><Link href="/calendar">Akce</Link><Link href="/articles">Články a poradna</Link><Link href="/breeds">Katalog plemen</Link></div><div><strong>PawMeet</strong><Link href="/about">O nás</Link><Link href="/contact">Kontakt</Link><Link href="/terms">Podmínky používání</Link><Link href="/privacy">Soukromí</Link></div></div>
        </div>
        <div className="pm-container pm-footer-bottom"><span>© {new Date().getFullYear()} PawMeet.eu</span><span>Vytvořeno pro lepší společné chvíle.</span></div>
      </footer>
    </main>
  )
}
