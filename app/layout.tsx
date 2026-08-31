'use client'

import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'
import Script from 'next/script'
import { usePathname } from 'next/navigation'

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
  
  // Přidali jsme '/ai', aby layout nezkresloval odsazení pro AI stránku, která si plnou šířku a odsazení řídí sama
  const isFullScreenPage = pathname === '/' || pathname === '/ai'

  return (
    <html lang="cs" suppressHydrationWarning>
      <head>
        {/* Puter.js pro AI bez API klíčů a limitů */}
        <Script src="https://js.puter.com/v2/" strategy="beforeInteractive" />
      </head>
      <body className="min-h-screen bg-white text-slate-900 relative transition-colors duration-200 antialiased selection:bg-purple-500 selection:text-white m-0 p-0">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <BottomNav />
          <main 
            className={`min-h-screen w-full transition-all duration-300 ${
              isFullScreenPage ? '' : 'md:pl-[240px] xl:md:pl-[260px]'
            }`}
          >
            {children}
          </main>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}