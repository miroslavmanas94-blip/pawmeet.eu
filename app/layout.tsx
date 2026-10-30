'use client'

import { Analytics } from '@vercel/analytics/react'
import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

// @ts-ignore: Side-effect CSS import
import './globals.css'

import BottomNav from '@/components/BottomNav'
import { ThemeProvider } from '@/components/ThemeProvider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined)
    }
  }, [])
  
  // Přidali jsme '/ai', aby layout nezkresloval odsazení pro AI stránku, která si plnou šířku a odsazení řídí sama
  const isFullScreenPage = ['/', '/login', '/register', '/obnova-hesla', '/reset-password', '/forgot-password', '/update-password', '/ai'].includes(pathname)

  return (
    <html lang="cs" suppressHydrationWarning>
      <body className="min-h-screen bg-white text-slate-900 relative transition-colors duration-200 antialiased selection:bg-purple-500 selection:text-white m-0 p-0 lg:flex">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <BottomNav />
          <div 
            className={`min-h-screen min-w-0 w-full flex-1 transition-all duration-300 ${
              isFullScreenPage ? '' : 'pt-[58px] pb-24 lg:pt-0 lg:pb-0'
            }`}
          >
            {children}
          </div>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}