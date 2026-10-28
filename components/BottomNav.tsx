'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  Home, MapPinned, MessageCircle, CalendarDays, Search, UserRound,
  ChevronDown, ChevronRight, GraduationCap, PawPrint, TrendingUp,
  Settings2, Award, Bookmark, CreditCard, ShieldCheck, Sparkles,
  Bell, PlusSquare, Menu, X, SunMoon, Compass
} from 'lucide-react'

const primary = [
  { href: '/domu', label: 'Domů', icon: Home },
  { href: '/map', label: 'Mapa', icon: MapPinned },
  { href: '/chat', label: 'Zprávy', icon: MessageCircle },
  { href: '/calendar', label: 'Akce', icon: CalendarDays },
  { href: '/search', label: 'Hledat', icon: Search },
]
const profileLinks = [
  { href: '/training', label: 'Trénink', icon: GraduationCap },
  { href: '/profile/dogs', label: 'Moji psi', icon: PawPrint },
  { href: '/training', label: 'Pokrok', icon: TrendingUp },
  { href: '/settings', label: 'Nastavení', icon: Settings2 },
  { href: '/training', label: 'Certifikáty', icon: Award },
  { href: '/calendar', label: 'Rezervace', icon: CalendarDays },
  { href: '/profile?section=posts', label: 'Moje příspěvky', icon: PlusSquare },
  { href: '/profile?section=saved', label: 'Uložené příspěvky', icon: Bookmark },
  { href: '/premium', label: 'Předplatné', icon: CreditCard },
  { href: '/settings?section=privacy', label: 'Soukromí', icon: ShieldCheck },
]
const moreLinks = [
  { href: '/ai', label: 'AI poradce', icon: Sparkles },
  { href: '/domu?view=notifications', label: 'Notifikace', icon: Bell },
  { href: '/domu', label: 'Komunita', icon: Compass },
]

export default function BottomNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [profileOpen, setProfileOpen] = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const hiddenRoutes = ['/', '/login', '/register', '/obnova-hesla', '/reset-password', '/forgot-password', '/update-password']
  if (hiddenRoutes.some((route) => route === '/' ? pathname === '/' : pathname?.startsWith(route))) return null
  if (!user) return null

  const isActive = (href: string) => { const path = href.split('?')[0]; return pathname === path || (path !== '/domu' && path !== '/profile' && pathname?.startsWith(path)) }
  const itemClass = (active: boolean) =>
    'group flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition-colors ' +
    (active
      ? 'bg-[var(--pm-active)] text-[var(--pm-forest)] shadow-sm'
      : 'text-[var(--pm-muted)] hover:bg-[var(--pm-hover)] hover:text-[var(--pm-forest)]')

  const NavLinks = ({ mobile = false }: { mobile?: boolean }) => (
    <>
      {primary.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} aria-current={active ? 'page' : undefined}
          className={mobile ? 'flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold' + (active ? ' text-[var(--pm-forest)]' : ' text-[var(--pm-muted)]') : itemClass(active)}>
          <Icon size={mobile ? 21 : 19} strokeWidth={1.8} />
          <span>{item.label}</span>
        </Link>
      })}
    </>
  )

  return (
    <>
      <aside className="pm-sidebar relative z-[100] hidden w-[264px] shrink-0 self-start flex-col border-r border-[var(--pm-line)] p-4 lg:flex">
        <Link href="/domu" className="mb-7 flex items-center gap-3 px-2 pt-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--pm-active)] text-[var(--pm-forest)]"><PawPrint size={22}/></span>
          <span><strong className="block text-xl font-black tracking-tight text-[var(--pm-forest)]">PawMeet</strong><span className="text-[11px] text-[var(--pm-muted)]">Spojuje pejskaře</span></span>
        </Link>
        <nav aria-label="Hlavní navigace" className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          <p className="mb-1 px-3 pt-1 text-[10px] font-bold uppercase tracking-[.18em] text-[var(--pm-muted)]">Hlavní nabídka</p>
          <NavLinks />
          <button type="button" onClick={() => setProfileOpen(v => !v)} aria-expanded={profileOpen}
            className="mt-5 flex items-center justify-between rounded-2xl px-3.5 py-3 text-left text-xs font-bold uppercase tracking-[.14em] text-[var(--pm-muted)] hover:bg-[var(--pm-hover)]">
            <span className="flex items-center gap-2"><UserRound size={16}/> Můj profil</span>
            {profileOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </button>
          {profileOpen && <div className="flex flex-col gap-1 pl-1">
            {profileLinks.map(item => { const Icon = item.icon; const active = isActive(item.href); return <Link key={item.label} href={item.href} className={itemClass(active)}><Icon size={18} strokeWidth={1.8}/><span>{item.label}</span></Link> })}
          </div>}
          <button type="button" onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen}
            className="mt-4 flex items-center justify-between rounded-2xl px-3.5 py-3 text-left text-xs font-bold uppercase tracking-[.14em] text-[var(--pm-muted)] hover:bg-[var(--pm-hover)]">
            <span className="flex items-center gap-2"><Compass size={16}/> Další funkce</span>
            {moreOpen ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
          </button>
          {moreOpen && moreLinks.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} className={itemClass(isActive(item.href))}><Icon size={18}/><span>{item.label}</span></Link> })}
        </nav>
        <div className="mt-3 rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-glass)] p-3 text-xs leading-5 text-[var(--pm-muted)]">
          <div className="mb-1 flex items-center gap-2 font-bold text-[var(--pm-forest)]"><SunMoon size={15}/> Tvoje PawMeet</div>
          Vše pro společný život se psem na jednom místě.
        </div>
      </aside>

      <div className="fixed left-0 right-0 top-0 z-[100] flex items-center justify-between border-b border-[var(--pm-line)] bg-[var(--pm-glass)] px-4 py-3 backdrop-blur-2xl lg:hidden">
        <Link href="/domu" className="flex items-center gap-2 font-black text-[var(--pm-forest)]"><PawPrint size={22}/> PawMeet</Link>
        <button type="button" aria-label={mobileOpen ? 'Zavřít nabídku' : 'Otevřít nabídku'} onClick={() => setMobileOpen(v => !v)} className="rounded-xl p-2 text-[var(--pm-forest)] hover:bg-[var(--pm-hover)]">
          {mobileOpen ? <X size={22}/> : <Menu size={22}/>}
        </button>
      </div>
      {mobileOpen && <div className="fixed inset-x-0 top-[57px] z-[99] max-h-[calc(100dvh-120px)] overflow-y-auto border-b border-[var(--pm-line)] bg-[var(--pm-glass)] p-4 shadow-xl backdrop-blur-2xl lg:hidden">
        <nav aria-label="Mobilní nabídka" className="grid grid-cols-2 gap-2">
          {primary.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={itemClass(isActive(item.href))}><Icon size={18}/>{item.label}</Link> })}
          {profileLinks.map(item => { const Icon = item.icon; return <Link key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className={itemClass(isActive(item.href))}><Icon size={18}/>{item.label}</Link> })}
          {moreLinks.map(item => { const Icon = item.icon; return <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)} className={itemClass(isActive(item.href))}><Icon size={18}/>{item.label}</Link> })}
        </nav>
      </div>}
      <nav aria-label="Spodní mobilní navigace" className="pm-mobile-bottom fixed inset-x-0 bottom-0 z-[100] flex items-stretch justify-around border-t border-[var(--pm-line)] px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur-2xl lg:hidden">
        <NavLinks mobile />
      </nav>
    </>
  )
}
