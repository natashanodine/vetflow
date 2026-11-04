import { useLanguage, type Language } from './language'

const options: { value: Language; label: string; name: string }[] = [
  { value: 'es', label: 'ES', name: 'Español' },
  { value: 'en', label: 'EN', name: 'English' },
]

/** ES | EN toggle for the public website. */
export function LanguageSwitch({ className = '' }: { className?: string }) {
  const { language, setLanguage } = useLanguage()
  return (
    <div
      role="group"
      aria-label={language === 'es' ? 'Idioma' : 'Language'}
      className={`inline-flex rounded-full border border-[#174f45]/25 p-0.5 text-xs font-bold ${className}`}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          lang={option.value}
          aria-label={option.name}
          aria-pressed={language === option.value}
          onClick={() => setLanguage(option.value)}
          className={`rounded-full px-3 py-1.5 transition ${
            language === option.value
              ? 'bg-[#174f45] text-white'
              : 'text-[#174f45] hover:bg-[#174f45]/10'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
