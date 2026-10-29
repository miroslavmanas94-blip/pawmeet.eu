'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Home, MessageCircle, MapPinned, CalendarDays, Sparkles, UserRound } from 'lucide-react'

const primary = [
  { href: '/domu', label: 'Domů', icon: Home },
  { href: '/chat', label: 'Chat', icon: MessageCircle },
  { href: '/map', label: 'Mapa', icon: MapPinned },
  { href: '/calendar', label: 'Akce', icon: CalendarDays },
  { href: '/ai', label: 'AI', icon: Sparkles },
  { href: '/profile', label: 'Profil', icon: UserRound },
]

const publicRoutes = [
  '/', '/login', '/register', '/obnova-hesla', '/reset-password',
  '/forgot-password', '/update-password', '/privacy', '/terms',
]

export default function BottomNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let active = true
    supabase.auth.getUser().then(({ data }) => {
      if (active) {
        setUser(data.user ?? null)
        setLoaded(true)
      }
    }).catch(() => {
      if (active) setLoaded(true)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user ?? null)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  if (!loaded || !user || publicRoutes.some((route) => route === '/' ? pathname === '/' : pathname?.startsWith(route))) return null

  const isActive = (href: string) =>
    pathname === href || (href !== '/domu' && href !== '/profile' && pathname?.startsWith(href + '/')) ||
    (href === '/profile' && pathname?.startsWith('/profile'))

  return (
    <>
      <aside className="pm-sidebar fixed inset-y-0 left-0 z-[100] hidden w-[244px] flex-col border-r border-[var(--pm-line)] px-4 py-5 lg:flex">
        <Link href="/domu" className="mb-8 flex items-center gap-3 rounded-2xl px-2 py-2" aria-label="PawMeet – domů">
          <img src="/logo.png" alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
          <span className="min-w-0">
            <strong className="block text-xl font-bold tracking-tight text-[var(--pm-forest)]">PawMeet</strong>
            <span className="block text-xs text-[var(--pm-muted)]">Spojuje pejskaře</span>
          </span>
        </Link>
        <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-[var(--pm-muted)]">Navigace</p>
        <nav aria-label="Hlavní navigace" className="flex flex-col gap-1">
          {primary.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={'flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ' + (active ? 'bg-[var(--pm-active)] text-[var(--pm-forest)]' : 'text-[var(--pm-muted)] hover:bg-[var(--pm-hover)] hover:text-[var(--pm-forest)]')}
              >
                <Icon size={19} strokeWidth={1.8} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto rounded-2xl border border-[var(--pm-line)] bg-[var(--pm-card)] p-3 text-xs leading-relaxed text-[var(--pm-muted)]">
          <p className="font-semibold text-[var(--pm-forest)]">Víc společných zážitků.</p>
          <p className="mt-1">Bezpečnější prostor pro tebe a tvého psa.</p>
        </div>
      </aside>

      <nav aria-label="Hlavní navigace" className="pm-mobile-bottom fixed inset-x-0 bottom-0 z-[100] grid grid-cols-6 border-t border-[var(--pm-line)] px-1 pb-[max(env(safe-area-inset-bottom),4px)] pt-1 lg:hidden">
        {primary.map((item) => {
          const Icon = item.icon
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={'flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 ' + (active ? 'text-[var(--pm-forest)]' : 'text-[var(--pm-muted)]')}
            >
              <span className={'flex h-7 w-9 items-center justify-center rounded-xl ' + (active ? 'bg-[var(--pm-active)]' : '')}>
                <Icon size={20} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
