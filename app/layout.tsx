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
      <body className="min-h-screen bg-white text-slate-900 relative transition-colors duration-200 antialiased selection:bg-purple-500 selection:text-white m-0 p-0">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <BottomNav />
          <main className="min-h-screen w-full md:pl-[240px] xl:md:pl-[260px] transition-all duration-300">
            {children}
          </main>
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  )
}