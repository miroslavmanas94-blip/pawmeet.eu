'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Domů', icon: '🏠', href: '/domu' },
    { label: 'Mapa', icon: '🗺️', href: '/mapa' },
    { label: 'Smečka', icon: '🐾', href: '/smecka' },
    { label: 'AI Radce', icon: '🤖', href: '/ai' },
    { label: 'Profil', icon: '👤', href: '/profil' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-gray-200/50 dark:border-gray-800/50 py-2 px-6 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center transition-all duration-200 ${
                isActive ? 'scale-110 text-indigo-600 dark:text-indigo-400 font-black' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <span className="text-2xl">{item.icon}</span>
              <span className="text-[10px] mt-0.5 font-bold">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}