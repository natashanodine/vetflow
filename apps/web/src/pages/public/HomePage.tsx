import { Link } from 'react-router-dom'
import { clinicContact } from '../../components/clinicContact'
import { EquoraMark } from '../../components/EquoraMark'
import { useContent } from '../../i18n/language'
import { mareEvaluation, services } from './servicesContent'

const content = {
  es: {
    eyebrow: 'Una nueva visión de la medicina equina',
    title: 'Ciencia. Cuidado. Caballo.',
    welcome:
      'Bienvenidos a EQUORA. Un nuevo concepto de medicina equina, construido alrededor de lo que más importa: el caballo.',
    book: 'Agenda tu cita',
    explore: 'Ver servicios',
    cardEyebrow: 'Nuestra filosofía',
    cardTitle: 'El caballo, siempre en el centro.',
    belief:
      'Creemos en una medicina que combina ciencia, experiencia y cuidado, siempre poniendo al caballo en el centro.',
    pillars: ['Ciencia', 'Experiencia', 'Cuidado'],
    servicesEyebrow: 'Nuestros servicios',
    servicesTitle: 'Medicina equina integral.',
    servicesIntro:
      'Con ciencia, experiencia y pasión por los caballos: acompañamos a cada caballo en cada etapa.',
    servicesLink: 'Ver todos los servicios →',
    differentEyebrow: 'Atención individualizada',
    differentTitle: 'Cada caballo es diferente. Su atención también debería serlo.',
    differentText:
      'No se trata solo de cuidar caballos. Se trata de entenderlos. Integramos ciencia, experiencia y tecnología para ofrecer una medicina equina personalizada y de alto nivel.',
    teamEyebrow: 'Nuestro equipo',
    teamTitle: 'Un equipo. Un mismo propósito: el bienestar de tu caballo.',
    teamText: 'Conoce a los veterinarios detrás de EQUORA y su experiencia en medicina equina.',
    teamLink: 'Conoce al equipo →',
  },
  en: {
    eyebrow: 'A new vision of equine medicine',
    title: 'Science. Care. Horse.',
    welcome:
      'Welcome to EQUORA. A new concept of equine medicine, built around what matters most: the horse.',
    book: 'Book an appointment',
    explore: 'See our services',
    cardEyebrow: 'Our philosophy',
    cardTitle: 'The horse, always at the centre.',
    belief:
      'We believe in medicine that combines science, experience and care, always putting the horse at the centre.',
    pillars: ['Science', 'Experience', 'Care'],
    servicesEyebrow: 'Our services',
    servicesTitle: 'Comprehensive equine medicine.',
    servicesIntro:
      'With science, experience and a passion for horses: we support every horse at every stage.',
    servicesLink: 'See all services →',
    differentEyebrow: 'Individual care',
    differentTitle: 'Every horse is different. Its care should be too.',
    differentText:
      'It isn’t only about caring for horses. It’s about understanding them. We bring together science, experience and technology to offer personalised, high-level equine medicine.',
    teamEyebrow: 'Our team',
    teamTitle: 'One team. One purpose: your horse’s well-being.',
    teamText: 'Meet the veterinarians behind EQUORA and their experience in equine medicine.',
    teamLink: 'Meet the team →',
  },
}

export default function HomePage() {
  const c = useContent(content)
  const serviceList = useContent(services)
  const evaluation = useContent(mareEvaluation)

  return (
    <>
      <section className="paper-grid overflow-hidden border-b border-[#17352f]/10">
        <div className="mx-auto grid min-h-[640px] max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="eyebrow text-[#d86f52]">{c.eyebrow}</p>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-7xl">
              {c.title}
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#46645d]">{c.welcome}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a
                href={clinicContact.phoneLink}
                className="rounded-full bg-[#174f45] px-6 py-3.5 font-bold text-white transition hover:bg-[#103e36]"
              >
                {c.book} · {clinicContact.phoneDisplay}
              </a>
              <Link
                to="/services"
                className="rounded-full border border-[#174f45]/25 bg-white/60 px-6 py-3.5 font-bold transition hover:border-[#174f45]"
              >
                {c.explore}
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl pb-10 pt-6">
            <div className="absolute left-0 top-0 h-56 w-56 rounded-full bg-[#dce9df]" />
            <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#f0c9b9]" />
            <div className="relative ml-auto w-[88%] rounded-[2.5rem] bg-[#174f45] p-7 text-white shadow-2xl shadow-[#174f45]/20 md:p-10">
              <div className="flex items-center justify-between border-b border-white/15 pb-7">
                <span className="eyebrow text-[#b8d3c5]">{c.cardEyebrow}</span>
                <EquoraMark className="h-10 w-10" />
              </div>
              <div className="py-9">
                <p className="font-display text-4xl font-semibold leading-tight">{c.cardTitle}</p>
                <p className="mt-5 text-sm leading-6 text-white/70">{c.belief}</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {c.pillars.map((label) => (
                  <div key={label} className="rounded-2xl bg-white/10 p-4 text-center">
                    <p className="font-bold">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="eyebrow text-[#d86f52]">{c.servicesEyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              {c.servicesTitle}
            </h2>
            <p className="mt-5 max-w-sm leading-7 text-[#56736c]">{c.servicesIntro}</p>
            <Link
              to="/services"
              className="mt-7 inline-block font-bold text-[#174f45] underline decoration-[#d86f52] decoration-2 underline-offset-8"
            >
              {c.servicesLink}
            </Link>
          </div>
          <div className="divide-y divide-[#17352f]/15 border-y border-[#17352f]/15">
            {serviceList.map((service, index) => (
              <article key={service.id} className="grid gap-5 py-7 sm:grid-cols-[60px_1fr]">
                <span className="font-display text-2xl text-[#d86f52]">0{index + 1}</span>
                <div>
                  <h3 className="text-2xl font-semibold">{service.title}</h3>
                  <p className="mt-2 max-w-2xl leading-7 text-[#56736c]">{service.summary}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="reproduction" className="scroll-mt-4 bg-[#17352f] text-white">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-3xl">
            <p className="eyebrow text-[#e59779]">{evaluation.eyebrow}</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              {evaluation.title}
            </h2>
            <p className="mt-5 leading-7 text-white/70">{evaluation.intro}</p>
            <p className="eyebrow mt-8 text-[#b8d3c5]">{evaluation.question}</p>
          </div>

          <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {evaluation.steps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6"
              >
                <span className="font-display text-3xl text-[#e59779]">{index + 1}</span>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{step.text}</p>
              </li>
            ))}
          </ol>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-[1.5rem] bg-white/10 p-7">
              <h3 className="text-xl font-semibold">{evaluation.whyTitle}</h3>
              <p className="mt-3 leading-7 text-white/75">{evaluation.why}</p>
            </div>
            <div className="flex flex-col justify-between gap-6 rounded-[1.5rem] bg-[#e59779] p-7 text-[#17352f]">
              <p className="font-display text-3xl font-semibold leading-tight">
                {evaluation.closing}
              </p>
              <a
                href={clinicContact.phoneLink}
                className="inline-flex w-fit rounded-full bg-[#17352f] px-5 py-3 font-bold text-white transition hover:bg-[#103e36]"
              >
                {evaluation.cta} →
              </a>
            </div>
          </div>
          <p className="eyebrow mt-8 text-right text-white/50">{evaluation.footnote}</p>
        </div>
      </section>

      <section className="bg-[#efe7d9]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:px-8">
          <div className="rounded-[2rem] bg-[#d86f52] p-9 text-white md:p-12">
            <p className="eyebrow text-white/75">{c.differentEyebrow}</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight">{c.differentTitle}</h2>
            <p className="mt-5 leading-7 text-white/85">{c.differentText}</p>
          </div>
          <div className="flex flex-col justify-center">
            <p className="eyebrow text-[#174f45]">{c.teamEyebrow}</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">{c.teamTitle}</h2>
            <p className="mt-5 max-w-xl leading-7 text-[#56736c]">{c.teamText}</p>
            <Link
              to="/team"
              className="mt-7 font-bold text-[#174f45] underline decoration-[#d86f52] decoration-2 underline-offset-8"
            >
              {c.teamLink}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
