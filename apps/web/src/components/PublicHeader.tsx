import { Link } from 'react-router-dom'
import { useContent } from '../i18n/language'
import { LanguageSwitch } from '../i18n/LanguageSwitch'
import { EquoraMark } from './EquoraMark'

const content = {
  es: {
    tagline: 'Ciencia. Cuidado. Caballo.',
    services: 'Servicios',
    reproduction: 'Reproducción',
    team: 'Equipo',
    contact: 'Contacto',
    login: 'Acceso personal',
  },
  en: {
    tagline: 'Science. Care. Horse.',
    services: 'Services',
    reproduction: 'Reproduction',
    team: 'Our team',
    contact: 'Contact',
    login: 'Staff login',
  },
}

export function PublicHeader() {
  const c = useContent(content)
  return (
    <header className="border-b border-[#17352f]/10 bg-[#fbf8f1]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-5 py-4 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <EquoraMark />
          <span>
            <span className="font-display block text-xl font-bold leading-none tracking-[0.12em]">
              EQUORA
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#56736c]">
              {c.tagline}
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-bold md:flex">
          <Link to="/services" className="hover:text-[#d86f52]">
            {c.services}
          </Link>
          <Link to="/#reproduction" className="hover:text-[#d86f52]">
            {c.reproduction}
          </Link>
          <Link to="/team" className="hover:text-[#d86f52]">
            {c.team}
          </Link>
          <Link to="/#contact" className="hover:text-[#d86f52]">
            {c.contact}
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitch />
          <Link
            to="/login"
            className="rounded-full border border-[#174f45] px-5 py-2.5 text-sm font-bold transition hover:bg-[#174f45] hover:text-white"
          >
            {c.login}
          </Link>
        </div>
      </div>
    </header>
  )
}
