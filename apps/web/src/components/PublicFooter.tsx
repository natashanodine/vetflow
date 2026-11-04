import { Link } from 'react-router-dom'
import { useContent } from '../i18n/language'
import { clinicContact } from './clinicContact'

const content = {
  es: {
    about:
      'Una nueva visión de la medicina equina. Ciencia, experiencia y cuidado, siempre con el caballo en el centro.',
    explore: 'Explorar',
    services: 'Servicios',
    team: 'Equipo',
    login: 'Acceso personal',
    contact: 'Contacto',
    area: 'Guayaquil y periferia',
    book: 'Agenda tu cita',
    rights: 'Todos los derechos reservados.',
  },
  en: {
    about:
      'A new vision of equine medicine. Science, experience and care, always with the horse at the centre.',
    explore: 'Explore',
    services: 'Services',
    team: 'Our team',
    login: 'Staff login',
    contact: 'Contact',
    area: 'Guayaquil and surrounding areas',
    book: 'Book an appointment',
    rights: 'All rights reserved.',
  },
}

export function PublicFooter() {
  const c = useContent(content)
  return (
    <footer id="contact" className="bg-[#17352f] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-3 lg:px-8">
        <div>
          <p className="font-display text-2xl font-bold tracking-[0.12em]">EQUORA</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-white/65">{c.about}</p>
        </div>
        <div>
          <p className="eyebrow text-[#b8d3c5]">{c.explore}</p>
          <div className="mt-4 flex flex-col gap-2 text-sm text-white/80">
            <Link to="/services">{c.services}</Link>
            <Link to="/team">{c.team}</Link>
            <Link to="/login">{c.login}</Link>
          </div>
        </div>
        <div>
          <p className="eyebrow text-[#b8d3c5]">{c.contact}</p>
          <ul className="mt-4 space-y-2 text-sm text-white/80">
            <li>
              {c.book}:{' '}
              <a href={clinicContact.phoneLink} className="font-bold text-white hover:underline">
                {clinicContact.phoneDisplay}
              </a>
            </li>
            <li>{c.area}</li>
            <li>
              Instagram:{' '}
              <a
                href={clinicContact.instagramUrl}
                target="_blank"
                rel="noreferrer"
                className="font-bold text-white hover:underline"
              >
                {clinicContact.instagramHandle}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">
        © {new Date().getFullYear()} EQUORA. {c.rights}
      </div>
    </footer>
  )
}
