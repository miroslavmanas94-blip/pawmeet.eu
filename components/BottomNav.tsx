'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  // Cesty přesně odpovídají vašim složkám v app/
  const navItems = [
    { href: '/domu', label: 'Domů', icon: '🏠' },
    { href: '/search', label: 'Hledat', icon: '🔍' },
    { href: '/map', label: 'Mapa', icon: '🗺️' },
    { href: '/ai', label: 'AI', icon: '🤖' },
    { href: '/chat', label: 'Chat', icon: '💬' },
    { href: '/profile', label: 'Profil', icon: '👤' },
  ]

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