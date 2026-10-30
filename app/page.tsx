'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowRight, Users, MessageCircle, ShieldCheck, Menu, X, Heart, UserRound, Dog, LockKeyhole, Sparkles } from 'lucide-react'

const features = [
  { icon: UserRound, title: 'Váš pejskařský profil', text: 'Představte sebe i svého parťáka a sdílejte jen to, co sami chcete.', href: '/profile' },
  { icon: Users, title: 'Komunita pejskařů', text: 'Poznávejte lidi, kteří mají rádi psy stejně jako vy.', href: '/community' },
  { icon: MessageCircle, title: 'Zprávy a domluva', text: 'Domluvte si společné venčení a zůstaňte v kontaktu.', href: '/messages' },
  { icon: Dog, title: 'Profily vašich psů', text: 'Mějte informace o svých psech přehledně na jednom místě.', href: '/dogs' },
  { icon: Sparkles, title: 'Pomocník PawMeet AI', text: 'Získejte inspiraci pro každodenní soužití a trénink.', href: '/ai' },
  { icon: LockKeyhole, title: 'Soukromí pod kontrolou', text: 'Rozhodujte sami, co o sobě sdílíte a co zůstane soukromé.', href: '/privacy' },
]

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <main className="pm-page">
      <header className="pm-header">
        <div className="pm-container pm-header-inner">
          <Link href="/" className="pm-brand" aria-label="PawMeet – domů">
            <img src="/logo.png" alt="Oficiální logo PawMeet" className="pm-logo-image" width="42" height="44" />
            <span>PawMeet<span className="pm-brand-dot">.</span></span>
          </Link>
          <button className="pm-menu-toggle" type="button" aria-label={menuOpen ? 'Zavřít nabídku' : 'Otevřít nabídku'} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
          <nav className={`pm-nav ${menuOpen ? 'is-open' : ''}`} aria-label="Hlavní navigace">
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
            <p className="pm-hero-text">PawMeet propojuje pejskaře, pomáhá poznávat nové parťáky a usnadňuje domlouvání společných procházek. Váš pes nemusí poznávat svět sám — a vy také ne.</p>
            <div className="pm-hero-actions">
              <Link href="/register" className="pm-button">Přidat se k PawMeet <ArrowRight size={18} /></Link>
              <Link href="#moznosti" className="pm-button pm-button-outline">Jak PawMeet funguje <ArrowRight size={17} /></Link>
            </div>
            <div className="pm-trust-line"><ShieldCheck size={17} /> Vaše soukromí. Vaše pravidla. Vaše tempo.</div>
          </div>
          <div className="pm-hero-art" aria-label="Ilustrace procházky se psem">
            <div className="pm-art-sun" />
            <div className="pm-art-path" />
            <div className="pm-art-hill pm-art-hill-back" />
            <div className="pm-art-hill pm-art-hill-front" />
            <div className="pm-art-card pm-art-card-top"><span className="pm-art-card-icon"><Users size={18} /></span><span><strong>Noví parťáci</strong><small>Blíž k přírodě</small></span></div>
            <div className="pm-dog-illustration"><Dog size={76} strokeWidth={1.35} /></div>
            <div className="pm-art-card pm-art-card-bottom"><span className="pm-avatar-stack"><i>A</i><i>M</i><i>K</i></span><span><strong>Procházky ve dvou i ve smečce</strong><small>Začněte jednoduše</small></span></div>
          </div>
        </div>
      </section>

      <section className="pm-intro pm-section">
        <div className="pm-container pm-intro-inner">
          <div><p className="pm-kicker">MÉNĚ HLEDÁNÍ. VÍC SPOLEČNÝCH CHVIL.</p><h2>Pejskařský život je lepší, když na něj nejste sami.</h2></div>
          <p className="pm-intro-text">Ať chcete poznat nové pejskaře, představit svého psa nebo si domluvit společné venčení, PawMeet vám pomůže udržet důležité věci přehledně na jednom místě.</p>
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
            <div className="pm-step"><span>02</span><div><h3>Prozkoumejte okolí</h3><p>Prohlédněte si profily a najděte lidi se stejným zájmem.</p></div></div>
            <div className="pm-step"><span>03</span><div><h3>Vyrazte ven</h3><p>Domluvte se s ostatními a užijte si společný čas se svým psem.</p></div></div>
          </div>
        </div>
      </section>

      <section className="pm-cta-section">
        <div className="pm-container"><div className="pm-cta"><div className="pm-cta-mark"><Heart size={25} /></div><p className="pm-kicker">PRO LIDI, KTEŘÍ MAJÍ RÁDI PSY</p><h2>Poznejte svou novou smečku.</h2><p>Vytvořte si profil a začněte budovat nová pejskařská přátelství.</p><Link href="/register" className="pm-button pm-button-light">Začít s PawMeet <ArrowRight size={18} /></Link></div></div>
      </section>

      <footer className="pm-footer">
        <div className="pm-container pm-footer-top">
          <div className="pm-footer-brand"><Link href="/" className="pm-brand"><img src="/logo.png" alt="Oficiální logo PawMeet" className="pm-logo-image" width="42" height="44" /><span>PawMeet<span className="pm-brand-dot">.</span></span></Link><p>Spojujeme pejskaře po celé republice.</p></div>
          <div className="pm-footer-links"><div><strong>Komunita</strong><Link href="/community">Pejskaři</Link><Link href="/dogs">Profily psů</Link><Link href="/messages">Zprávy</Link><Link href="/ai">PawMeet AI</Link></div><div><strong>PawMeet</strong><Link href="/about">O nás</Link><Link href="/contact">Kontakt</Link><Link href="/terms">Podmínky používání</Link><Link href="/privacy">Soukromí</Link></div></div>
        </div>
        <div className="pm-container pm-footer-bottom"><span>© {new Date().getFullYear()} PawMeet.eu</span><span>Vytvořeno pro lepší společné chvíle.</span></div>
      </footer>
    </main>
  )
}
