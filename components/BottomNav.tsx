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
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [supabase])

  const hiddenRoutes = [
    '/',
    '/login',
    '/register',
    '/obnova-hesla',
    '/reset-password',
    '/forgot-password',
    '/update-password'
  ]

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

  const navItems = user 
    ? allNavItems 
    : allNavItems.filter((item) => item.href === '/domu')

  return (
    <nav
      className="fixed left-0 z-[100] bg-white/95 backdrop-blur-xl border-neutral-200 shadow-md select-none overflow-hidden
        /* Mobilní pozice: spodní lišta */
        bottom-0 w-full border-t py-2 px-2 flex flex-row items-center justify-around h-auto
        /* Desktop pozice: trvale viditelný levý panel */
        md:top-0 md:bottom-0 md:h-screen md:w-[240px] xl:md:w-[260px] md:flex-col md:justify-between md:border-r md:border-t-0 md:p-4"
    >
      <div className="flex flex-col gap-6 w-full overflow-hidden">
        {/* Hlavička s logem */}
        <div className="hidden md:flex items-center px-3 pt-2">
          <Link href="/domu">
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 bg-clip-text text-transparent">
              PawMeet
            </h1>
          </Link>
        </div>

        {/* Odkazy v navigaci */}
        <div className="flex flex-row md:flex-col justify-around md:justify-start gap-1 md:gap-1.5 w-full">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 px-2.5 md:px-3.5 py-1.5 md:py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-600 font-bold md:border-l-4 md:border-indigo-600 shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] md:text-sm tracking-wide">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Profilová lišta dole (Desktop) */}
      {user && (
        <div className="hidden md:flex pt-4 border-t border-neutral-200 px-2 w-full">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
              {user.email?.[0].toUpperCase() || 'U'}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-bold text-neutral-800 truncate">{user.email?.split('@')[0]}</span>
              <span className="text-[10px] text-neutral-500 truncate">{user.email}</span>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}