import { createContext, useContext } from 'react'

/** Languages of the public website. The staff app stays in English. */
export type Language = 'es' | 'en'

export const LanguageContext = createContext<{
  language: Language
  setLanguage: (language: Language) => void
}>({ language: 'es', setLanguage: () => undefined })

export function useLanguage() {
  return useContext(LanguageContext)
}

/** Picks the text for the current language: `const c = useContent(content)`. */
export function useContent<T>(content: Record<Language, T>) {
  return content[useLanguage().language]
}
