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
    photos: {
      hero: 'Caballo tordo de perfil',
      foal: 'Potro recién nacido descansando en el pasto',
      mareFoal: 'Yegua y su potro galopando en un campo',
      herd: 'Tres caballos en un prado',
    },
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
    photos: {
      hero: 'Grey horse in profile',
      foal: 'Newborn foal resting in the grass',
      mareFoal: 'Mare and foal galloping across a field',
      herd: 'Three horses in a meadow',
    },
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

          <div className="relative mx-auto w-full max-w-xl lg:pb-24">
            <img
              src="/home/grey-horse.jpg"
              alt={c.photos.hero}
              className="aspect-[4/3] w-full rounded-[2.5rem] object-cover object-[85%_center] shadow-2xl shadow-[#174f45]/20"
            />
            <div className="relative mx-4 -mt-10 rounded-[2rem] bg-[#174f45] p-6 text-white shadow-2xl shadow-[#174f45]/30 md:p-7 lg:absolute lg:-bottom-2 lg:left-[-4rem] lg:mx-0 lg:mt-0 lg:w-[50%]">
              <div className="flex items-center justify-between gap-4">
                <span className="eyebrow text-[#b8d3c5]">{c.cardEyebrow}</span>
                <EquoraMark className="h-9 w-9" />
              </div>
              <p className="font-display mt-4 text-2xl font-semibold leading-tight md:text-3xl">
                {c.cardTitle}
              </p>
              <p className="mt-3 text-sm leading-6 text-white/75">{c.belief}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {c.pillars.map((label) => (
                  <span
                    key={label}
                    className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold"
                  >
                    {label}
                  </span>
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
            <img
              src="/home/foal-resting.jpg"
              alt={c.photos.foal}
              loading="lazy"
              className="mt-10 hidden aspect-[4/5] w-full max-w-sm rounded-[2rem] object-cover object-[60%_center] lg:block"
            />
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
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr]">
            <div>
              <p className="eyebrow text-[#e59779]">{evaluation.eyebrow}</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
                {evaluation.title}
              </h2>
              <p className="mt-5 leading-7 text-white/70">{evaluation.intro}</p>
            </div>
            <img
              src="/home/mare-and-foal.jpg"
              alt={c.photos.mareFoal}
              loading="lazy"
              className="aspect-[3/2] w-full rounded-[2rem] object-cover"
            />
          </div>
          <p className="eyebrow mt-12 text-[#b8d3c5]">{evaluation.question}</p>

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
          <div className="relative min-h-[520px] overflow-hidden rounded-[2rem]">
            <img
              src="/home/horses-in-field.jpg"
              alt={c.photos.herd}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#17352f]/95 via-[#17352f]/45 to-transparent" />
            <div className="relative flex h-full min-h-[520px] flex-col justify-end p-9 text-white md:p-12">
              <p className="eyebrow text-[#f0c9b9]">{c.differentEyebrow}</p>
              <h2 className="mt-4 text-3xl font-semibold leading-tight md:text-4xl">
                {c.differentTitle}
              </h2>
              <p className="mt-4 leading-7 text-white/85">{c.differentText}</p>
            </div>
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
