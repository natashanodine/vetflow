import { Link } from 'react-router-dom'
import { clinicContact } from '../../components/clinicContact'
import { useContent } from '../../i18n/language'
import { services } from './servicesContent'

const content = {
  es: {
    eyebrow: 'Nuestros servicios',
    title: 'Medicina equina integral.',
    intro:
      'En EQUORA creemos en una medicina equina integral, donde la ciencia, la experiencia y el cuidado individualizado se unen para acompañar a cada caballo en cada etapa.',
    reproductionLink: 'Ver el programa de evaluación reproductiva →',
    ctaEyebrow: 'Agenda tu cita',
    ctaTitle: 'Cada detalle cuenta, cada caballo importa.',
    ctaText: 'Atendemos en Guayaquil y periferia. Escríbenos o llámanos para coordinar tu visita.',
    call: 'Llamar',
  },
  en: {
    eyebrow: 'Our services',
    title: 'Comprehensive equine medicine.',
    intro:
      'At EQUORA we believe in comprehensive equine medicine, where science, experience and individual care come together to support every horse at every stage.',
    reproductionLink: 'See the reproductive evaluation programme →',
    ctaEyebrow: 'Book an appointment',
    ctaTitle: 'Every detail counts, every horse matters.',
    ctaText:
      'We work in Guayaquil and the surrounding areas. Message or call us to arrange a visit.',
    call: 'Call',
  },
}

export default function ServicesPage() {
  const c = useContent(content)
  const serviceList = useContent(services)

  return (
    <>
      <section className="paper-grid border-b border-[#17352f]/10">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow text-[#d86f52]">{c.eyebrow}</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
            {c.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#56736c]">{c.intro}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {serviceList.map((service, index) => (
            <article
              key={service.id}
              className="flex flex-col rounded-[2rem] border border-[#17352f]/12 bg-white p-7 shadow-sm"
            >
              <span className="font-display text-3xl text-[#d86f52]">0{index + 1}</span>
              <h2 className="mt-7 text-3xl font-semibold">{service.title}</h2>
              <p className="mt-4 leading-7 text-[#56736c]">{service.summary}</p>
              <ul className="mt-7 space-y-3 border-t border-[#17352f]/10 pt-6 text-sm">
                {service.items.map((item) => (
                  <li key={item.label} className="flex gap-3">
                    <span className="text-[#d86f52]">•</span>
                    <span>
                      <span className="font-bold">{item.label}</span>
                      {item.detail && (
                        <span className="mt-1 block leading-6 text-[#56736c]">{item.detail}</span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
              {service.note && <p className="mt-5 text-sm italic text-[#56736c]">{service.note}</p>}
              {service.id === 'reproduction' && (
                <Link
                  to="/#reproduction"
                  className="mt-auto pt-6 text-sm font-bold text-[#174f45] underline decoration-[#d86f52] decoration-2 underline-offset-4"
                >
                  {c.reproductionLink}
                </Link>
              )}
            </article>
          ))}

          <article className="flex flex-col justify-between rounded-[2rem] bg-[#174f45] p-7 text-white shadow-sm">
            <div>
              <p className="eyebrow text-[#b8d3c5]">{c.ctaEyebrow}</p>
              <h2 className="mt-5 text-3xl font-semibold">{c.ctaTitle}</h2>
              <p className="mt-4 leading-7 text-white/75">{c.ctaText}</p>
            </div>
            <a
              href={clinicContact.phoneLink}
              className="mt-8 inline-flex w-fit rounded-full bg-white px-5 py-3 font-bold text-[#174f45] transition hover:bg-[#dce9df]"
            >
              {c.call} {clinicContact.phoneDisplay}
            </a>
          </article>
        </div>
      </section>
    </>
  )
}
