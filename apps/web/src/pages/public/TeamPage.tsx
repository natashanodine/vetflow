import { useContent } from '../../i18n/language'

interface Member {
  name: string
  photo: string
  /** Where the photo is cropped from (CSS object-position). */
  photoPosition: string
  background: string
  paragraphs: string[]
  interestsTitle: string
  interests: string[]
  closing?: string
}

const content: Record<
  'es' | 'en',
  { eyebrow: string; title: string; intro: string; members: Member[] }
> = {
  es: {
    eyebrow: 'Nuestro equipo',
    title: 'Un equipo. Un mismo propósito.',
    intro:
      'Veterinarios especializados en medicina equina, unidos por un mismo objetivo: el bienestar de tu caballo.',
    members: [
      {
        name: 'Carmen Cox',
        photo: '/team/carmen-cox.jpg',
        photoPosition: 'center',
        background: 'bg-[#dce9df]',
        paragraphs: [
          'Su conexión con los caballos comenzó desde muy pequeña. Creció montando a caballo y desarrolló una temprana pasión por su salud, bienestar y rendimiento.',
          'Obtuvo su título de Médico Veterinario (DVM) en la Universidad San Francisco de Quito, Ecuador, donde adquirió una sólida base en medicina veterinaria y un especial interés por la salud equina.',
          'Cuenta con más de 2 años de experiencia en medicina equina, con experiencia clínica en Ecuador y Estados Unidos, además de un diplomado de posgrado en Reproducción y Neonatología Equina.',
          'En Ecuador trabajó en reproducción equina, neonatología y medicina deportiva, con experiencia práctica en casos reproductivos, cuidados neonatales y problemas de rendimiento.',
          'Realizó un internado en Medicina Equina en la Universidad de California, Davis (UC Davis), donde perfeccionó sus habilidades en medicina y cirugía equina, con exposición a una amplia variedad de casos y técnicas diagnósticas avanzadas.',
          'Completó el Equine Rehabilitation Certificate Program (CERP) de la Universidad de Tennessee, reforzando su enfoque en la rehabilitación, la prevención y la recuperación del caballo atleta.',
          'En Estados Unidos también trabajó en medicina hospitalaria y cuidados intensivos, investigación clínica y como técnica de cámara hiperbárica en Brazos Valley Equine Hospital, ganando experiencia en el manejo de casos complejos.',
          'Además, fue coordinadora de estudios y proyectos de investigación en colaboración con UC Davis y la Universidad de Cornell, aportando una visión basada en la investigación y en la evidencia científica.',
        ],
        interestsTitle: 'Sus principales áreas de interés:',
        interests: [
          'Reproducción equina',
          'Rehabilitación equina',
          'Medicina basada en la evidencia',
        ],
        closing:
          'Para ella, la medicina equina combina dos elementos esenciales: la ciencia y una profunda comprensión del caballo como atleta y compañero.',
      },
      {
        name: 'Marcel Speck',
        photo: '/team/marcel-speck.jpg',
        photoPosition: 'top',
        background: 'bg-[#efe7d9]',
        paragraphs: [
          'Médico veterinario con 3 años de experiencia en medicina equina. Recientemente completó un internado en Medicina Equina en DeCillo Equine Clinic, en Texas, Estados Unidos.',
          'Cuenta con una Maestría en Anatomía Equina, y sus principales áreas de práctica son la Medicina Deportiva y la Medicina Interna.',
        ],
        interestsTitle: 'Sus principales áreas de interés:',
        interests: [
          'Medicina basada en la evidencia',
          'Bienestar y rendimiento',
          'Trabajo en equipo',
          'Educación continua',
        ],
      },
    ],
  },
  en: {
    eyebrow: 'Our team',
    title: 'One team. One purpose.',
    intro:
      'Veterinarians specialised in equine medicine, united by one goal: your horse’s well-being.',
    members: [
      {
        name: 'Carmen Cox',
        photo: '/team/carmen-cox.jpg',
        photoPosition: 'center',
        background: 'bg-[#dce9df]',
        paragraphs: [
          'Her connection with horses began at a young age. Growing up riding horses, she developed an early passion for their health, well-being, and performance.',
          'She earned her Doctor of Veterinary Medicine (DVM) degree from the University of San Francisco de Quito in Ecuador, where she gained a strong foundation in veterinary medicine and developed a particular interest in equine health.',
          'She has over 2 years of experience in Equine Medicine, with clinical experience in Ecuador and the United States, as well as a postgraduate diploma in Equine Reproduction and Neonatology.',
          'Her clinical experience in Ecuador included working in equine reproduction, neonatology, and sports medicine, where she gained hands-on experience in managing reproductive cases, neonatal care, and performance-related issues in horses.',
          'She also completed an internship in Equine Medicine at the University of California, Davis (UC Davis), where she further honed her skills in equine medicine and surgery, gaining exposure to a wide range of cases and advanced diagnostic techniques.',
          'Her education includes the Equine Rehabilitation Certificate Program (CERP) at the University of Tennessee, further strengthening her focus on rehabilitation, prevention, and recovery in equine athletes.',
          'During her clinical experience in the United States, she also worked in hospital and intensive care medicine, clinical research, and as a hyperbaric chamber technician at Brazos Valley Equine Hospital, gaining valuable experience in managing complex cases.',
          'Additionally, she served as a study and research project coordinator in collaboration with UC Davis and Cornell University, bringing a research-driven perspective and an evidence-based approach to veterinary medicine.',
        ],
        interestsTitle: 'Her main areas of interest include:',
        interests: ['Equine Reproduction', 'Equine Rehabilitation', 'Evidence-Based Medicine'],
        closing:
          'For her, equine medicine combines two essential elements: science and a deep understanding of the horse as both an athlete and a companion.',
      },
      {
        name: 'Marcel Speck',
        photo: '/team/marcel-speck.jpg',
        photoPosition: 'top',
        background: 'bg-[#efe7d9]',
        paragraphs: [
          'Veterinarian with 3 years of experience in equine medicine, who recently completed an Equine Medicine Internship at DeCillo Equine Clinic in Texas, USA.',
          'His academic background includes a Master’s Degree in Equine Anatomy, and his main areas of practice are Sports Medicine and Internal Medicine.',
        ],
        interestsTitle: 'His main areas of interest include:',
        interests: [
          'Evidence-Based Medicine',
          'Well-Being and Performance',
          'Teamwork',
          'Continuing Education',
        ],
      },
    ],
  },
}

export default function TeamPage() {
  const c = useContent(content)
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
        <div className="grid gap-8 md:grid-cols-2">
          {c.members.map((member) => (
            <article
              key={member.name}
              className={`rounded-[2rem] p-8 md:p-10 ${member.background}`}
            >
              <div className="grid h-full content-start justify-items-center rounded-[1.5rem] border border-dashed border-[#174f45]/30 py-8 text-center">
                <div className="px-4">
                  <h2 className="font-display text-3xl font-semibold">{member.name}</h2>
                  <img
                    src={member.photo}
                    alt={member.name}
                    style={{ objectPosition: member.photoPosition }}
                    className="mx-auto mt-5 h-40 w-40 rounded-full object-cover shadow-sm ring-4 ring-white"
                  />
                  {member.paragraphs.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#56736c]"
                    >
                      {paragraph}
                    </p>
                  ))}
                  <p className="mx-auto mt-5 max-w-sm text-sm font-bold text-[#174f45]">
                    {member.interestsTitle}
                  </p>
                  <ul className="mx-auto mt-2 flex max-w-sm flex-wrap justify-center gap-2">
                    {member.interests.map((interest) => (
                      <li
                        key={interest}
                        className="rounded-full bg-white/70 px-3 py-1 text-xs font-bold text-[#174f45]"
                      >
                        {interest}
                      </li>
                    ))}
                  </ul>
                  {member.closing && (
                    <p className="mx-auto mt-5 max-w-sm text-sm italic leading-6 text-[#56736c]">
                      {member.closing}
                    </p>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
