import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/react'

// @ts-ignore: Side-effect CSS import
import './globals.css'

import BottomNav from '@/components/BottomNav'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'PawMeet | Komunita pro vašeho psa a kočku',
  description: 'Místo, kde se setkávají milovníci zvířat, sdílí své příběhy a plánují venčení.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs" suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-16 relative transition-colors duration-200 antialiased selection:bg-purple-500 selection:text-white">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}

          <BottomNav />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}