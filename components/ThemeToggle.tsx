'use client'

import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Zjistíme, zda už je tmavý režim uložen v localStorage nebo preferován systémem
    const savedTheme = localStorage.getItem('theme')
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    } else {
      setIsDark(false)
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
      setIsDark(false)
    } else {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
      setIsDark(true)
    }
  }

  // Zabrání bliknutí před načtením stavu na klientovi
  if (!mounted) {
    return <div className="w-12 h-7 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse" />
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Přepnout tmavý režim"
      title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
      className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${
        isDark ? 'bg-purple-900' : 'bg-slate-300'
      }`}
    >
      <span className="sr-only">Přepnout tmavý režim</span>
      <span
        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out flex items-center justify-center text-xs select-none ${
          isDark ? 'translate-x-5' : 'translate-x-0'
        }`}
      >
        {isDark ? '🌙' : '☀️'}
      </span>
    </button>
  )
}