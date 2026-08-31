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
    { 
      href: '/domu', 
      label: 'Domů', 
      activeClass: 'bg-blue-50 text-blue-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ) 
    },
    { 
      href: '/search', 
      label: 'Hledat', 
      activeClass: 'bg-amber-50 text-amber-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ) 
    },
    { 
      href: '/map', 
      label: 'Mapa', 
      activeClass: 'bg-emerald-50 text-emerald-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ) 
    },
    { 
      href: '/ai', 
      label: 'AI', 
      activeClass: 'bg-purple-50 text-purple-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
        </svg>
      ) 
    },
    { 
      href: '/chat', 
      label: 'Chat', 
      activeClass: 'bg-sky-50 text-sky-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ) 
    },
    { 
      href: '/profile', 
      label: 'Profil', 
      activeClass: 'bg-rose-50 text-rose-600',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ) 
    },
  ]

  const navItems = user 
    ? allNavItems 
    : allNavItems.filter((item) => item.href === '/domu')

  return (
    <nav
      className="fixed left-0 z-[100] bg-white/95 backdrop-blur-xl border-neutral-200 shadow-sm select-none overflow-hidden
        /* Mobilní pozice: spodní lišta */
        bottom-0 w-full border-t py-2 px-2 flex flex-row items-center justify-around h-auto
        /* Desktop pozice: trvale viditelný levý panel */
        md:top-0 md:bottom-0 md:h-screen md:w-[240px] xl:md:w-[260px] md:flex-col md:justify-between md:border-r md:border-t-0 md:p-4"
    >
      <div className="flex flex-col gap-6 w-full overflow-hidden">
        {/* Hlavička s logem */}
        <div className="hidden md:flex items-center px-3 pt-2">
          <Link href="/domu">
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-500 bg-clip-text text-transparent">
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
                className={`flex flex-col md:flex-row items-center gap-1 md:gap-3.5 px-2.5 md:px-3.5 py-1.5 md:py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? `${item.activeClass} font-semibold shadow-sm`
                    : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800'
                }`}
              >
                {item.icon}
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-sm flex-shrink-0">
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