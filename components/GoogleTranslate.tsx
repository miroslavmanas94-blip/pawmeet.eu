'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    googleTranslateElementInit?: () => void
    google?: any
  }
}

export const GoogleTranslate = () => {
  useEffect(() => {
    // 1. Definice inicializace
    window.googleTranslateElementInit = () => {
      if (window.google && window.google.translate) {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'cs',
            includedLanguages: 'cs,sk,en,de,pl,uk',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false,
          },
          'google_translate_element'
        )
      }
    }

    // 2. Bezpečné načtení skriptu s plným HTTPS protokolem
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script')
      script.id = 'google-translate-script'
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      document.body.appendChild(script)
    } else if (window.google && window.google.translate) {
      window.googleTranslateElementInit()
    }
  }, [])

  return (
    <div className="google-translate-wrapper min-h-[38px] flex items-center">
      <div id="google_translate_element" />
    </div>
  )
}