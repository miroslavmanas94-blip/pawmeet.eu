import { Analytics } from '@vercel/analytics/react'
// @ts-ignore: Allow side-effect CSS import without module declarations
import './globals.css'
import BottomNav from '@/components/BottomNav'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="cs">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pb-16">
        {children}
        {/* Vložení spodní lišty pro celou aplikaci */}
        <BottomNav />
        {/* Vercel Analytics pro měření návštěvnosti */}
        <Analytics />
      </body>
    </html>
  )
}