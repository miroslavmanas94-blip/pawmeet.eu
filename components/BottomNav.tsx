'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function BottomNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    // Načtení stávajícího uživatele
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    // Posluchač změn přihlášení
    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Skrytí spodní lišty na auth stránkách a obnově hesla
  const hiddenRoutes = [
    '/',
    '/login',
    '/register',
    '/obnova-hesla',
    '/reset-password',
    '/forgot-password',
    '/update-password'
  ]

  // Použití startsWith zajistí skrytí i v případě tokenů nebo query parametrů v URL
  const isHidden = hiddenRoutes.some((route) => 
    route === '/' ? pathname === '/' : pathname?.startsWith(route)
  )

  if (isHidden) {
    return null
  }

  const allNavItems = [
    { href: '/domu', label: 'Domů', icon: '🏠' },
    { href: '/search', label: 'Hledat', icon: '🔍' },
    { href: '/map', label: 'Mapa', icon: '🗺️' },
    { href: '/ai', label: 'AI', icon: '🤖' },
    { href: '/chat', label: 'Chat', icon: '💬' },
    { href: '/profile', label: 'Profil', icon: '👤' },
  ]

  // Pro nepropojené hosty se zobrazí výhradně "Domů"
  const navItems = user 
    ? allNavItems 
    : allNavItems.filter((item) => item.href === '/domu')

  return (
    <nav className="fixed bottom-0 left-0 w-full z-[100] bg-white/95 backdrop-blur-xl border-t border-neutral-200/80 shadow-lg px-2 py-2">
      <div className="w-full max-w-7xl mx-auto flex justify-around items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all ${
                isActive
                  ? 'text-indigo-600 font-bold scale-105'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}