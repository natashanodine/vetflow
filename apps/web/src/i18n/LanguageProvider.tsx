import { useEffect, useState, type ReactNode } from 'react'
import { LanguageContext, type Language } from './language'

const STORAGE_KEY = 'equora-language'

const titles: Record<Language, string> = {
  es: 'EQUORA · Una nueva visión de la medicina equina',
  en: 'EQUORA · A new vision of equine medicine',
}

function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'es' || saved === 'en') return saved
  } catch {
    // Storage can be unavailable (private mode); fall back to Spanish.
  }
  return 'es'
}

/** Spanish by default; the visitor's choice is remembered in this browser. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  useEffect(() => {
    document.documentElement.lang = language
    document.title = titles[language]
  }, [language])

  function setLanguage(next: Language) {
    setLanguageState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not saved; the choice still applies until the page is closed.
    }
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  )
}
