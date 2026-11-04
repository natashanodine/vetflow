import type { Language } from '../../i18n/language'

export interface ServiceItem {
  label: string
  /** A short explanation under the item, when there is one. */
  detail?: string
}

export interface Service {
  id: string
  title: string
  /** One or two sentences for the home page and the services page. */
  summary: string
  items: ServiceItem[]
  /** e.g. a certification, shown under the list. */
  note?: string
}

/** EQUORA's services, as they describe them. Used on the home and services pages. */
export const services: Record<Language, Service[]> = {
  es: [
    {
      id: 'reproduction',
      title: 'Reproducción equina',
      summary:
        'Manejo reproductivo de la yegua en cada etapa, desde la evaluación hasta el diagnóstico de gestación.',
      items: [
        { label: 'Manejo reproductivo de yeguas' },
        { label: 'Monitoreo folicular' },
        { label: 'Inseminación artificial' },
        { label: 'Semen fresco y congelado' },
        { label: 'Transferencia de embriones' },
        { label: 'Diagnóstico de gestación' },
      ],
    },
    {
      id: 'internal',
      title: 'Medicina interna',
      summary: 'Evaluación clínica, diagnóstico, tratamiento y medicina preventiva.',
      items: [
        { label: 'Evaluación clínica completa' },
        { label: 'Diagnóstico y tratamiento' },
        { label: 'Medicina preventiva' },
      ],
    },
    {
      id: 'sports',
      title: 'Medicina deportiva',
      summary:
        'Evaluación del rendimiento y de cojera, diagnóstico de lesiones, planes de tratamiento y prevención.',
      items: [
        { label: 'Evaluación de rendimiento' },
        { label: 'Evaluación de cojera' },
        { label: 'Diagnóstico de lesiones' },
        { label: 'Planes de tratamiento' },
        { label: 'Prevención de lesiones' },
      ],
    },
    {
      id: 'imaging',
      title: 'Diagnóstico por imagen',
      summary:
        'Ultrasonografía y radiografía para diagnósticos precisos y un seguimiento integral.',
      items: [
        {
          label: 'Ultrasonografía',
          detail: 'Evaluación reproductiva y general, monitoreo folicular, gestación.',
        },
        {
          label: 'Radiografía (rayos X)',
          detail:
            'Diagnóstico preciso de estructuras óseas y articulares para planificar el tratamiento más efectivo.',
        },
      ],
    },
    {
      id: 'rehabilitation',
      title: 'Rehabilitación equina',
      summary:
        'Programas personalizados y terapias físicas para la recuperación funcional y la calidad de vida.',
      items: [
        { label: 'Programas de rehabilitación personalizados' },
        { label: 'Terapias físicas y modalidades avanzadas' },
        { label: 'Recuperación funcional' },
        { label: 'Mejora de calidad de vida' },
      ],
      note: 'Certificación CERP – University of Tennessee',
    },
  ],
  en: [
    {
      id: 'reproduction',
      title: 'Equine reproduction',
      summary:
        'Reproductive management of the mare at every stage, from evaluation to pregnancy diagnosis.',
      items: [
        { label: 'Mare reproductive management' },
        { label: 'Follicle monitoring' },
        { label: 'Artificial insemination' },
        { label: 'Fresh and frozen semen' },
        { label: 'Embryo transfer' },
        { label: 'Pregnancy diagnosis' },
      ],
    },
    {
      id: 'internal',
      title: 'Internal medicine',
      summary: 'Clinical evaluation, diagnosis, treatment and preventive medicine.',
      items: [
        { label: 'Complete clinical evaluation' },
        { label: 'Diagnosis and treatment' },
        { label: 'Preventive medicine' },
      ],
    },
    {
      id: 'sports',
      title: 'Sports medicine',
      summary:
        'Performance and lameness evaluation, injury diagnosis, treatment plans and prevention.',
      items: [
        { label: 'Performance evaluation' },
        { label: 'Lameness evaluation' },
        { label: 'Injury diagnosis' },
        { label: 'Treatment plans' },
        { label: 'Injury prevention' },
      ],
    },
    {
      id: 'imaging',
      title: 'Diagnostic imaging',
      summary: 'Ultrasound and radiography for precise diagnosis and complete follow-up.',
      items: [
        {
          label: 'Ultrasound',
          detail: 'Reproductive and general evaluation, follicle monitoring, pregnancy.',
        },
        {
          label: 'Radiography (X-rays)',
          detail: 'Precise diagnosis of bones and joints to plan the most effective treatment.',
        },
      ],
    },
    {
      id: 'rehabilitation',
      title: 'Equine rehabilitation',
      summary:
        'Personalised programmes and physical therapies for functional recovery and quality of life.',
      items: [
        { label: 'Personalised rehabilitation programmes' },
        { label: 'Physical therapies and advanced modalities' },
        { label: 'Functional recovery' },
        { label: 'Improved quality of life' },
      ],
      note: 'CERP certification – University of Tennessee',
    },
  ],
}

/** The mare reproductive evaluation (their reproduction programme post). */
export const mareEvaluation: Record<
  Language,
  {
    eyebrow: string
    title: string
    intro: string
    question: string
    steps: { title: string; text: string }[]
    whyTitle: string
    why: string
    closing: string
    cta: string
    footnote: string
  }
> = {
  es: {
    eyebrow: 'Programa de reproducción',
    title: 'Evaluación reproductiva de la yegua',
    intro:
      'La reproducción equina comienza mucho antes de la inseminación. Una evaluación reproductiva completa nos permite conocer el estado reproductivo de cada yegua y tomar decisiones más precisas durante su ciclo.',
    question: '¿Qué buscamos y por qué importa?',
    steps: [
      { title: 'Historia reproductiva', text: 'Conocer antecedentes y resultados previos.' },
      { title: 'Ovarios', text: 'Evaluar folículos, cuerpo lúteo y actividad ovárica.' },
      { title: 'Útero', text: 'Valorar tamaño, tono y condiciones del endometrio.' },
      { title: 'Cérvix', text: 'Evaluar su apariencia y grado de relajación.' },
      {
        title: 'Salud uterina',
        text: 'Detectar infecciones o alteraciones que puedan afectar la fertilidad.',
      },
    ],
    whyTitle: '¿Por qué importa?',
    why: 'Conocer dónde se encuentra la yegua dentro de su ciclo nos permite determinar el momento adecuado para la inseminación, identificar posibles alteraciones y establecer un manejo reproductivo individualizado, aumentando las probabilidades de una gestación exitosa.',
    closing: 'Cada yegua es diferente. Cada ciclo cuenta.',
    cta: 'Agenda tu evaluación reproductiva',
    footnote: 'Salud hoy. Futuros mañana.',
  },
  en: {
    eyebrow: 'Reproduction programme',
    title: 'Mare reproductive evaluation',
    intro:
      'Equine reproduction starts long before insemination. A complete reproductive evaluation tells us where each mare stands and lets us make more precise decisions throughout her cycle.',
    question: 'What we look for, and why it matters',
    steps: [
      { title: 'Reproductive history', text: 'Previous history and past results.' },
      { title: 'Ovaries', text: 'Follicles, corpus luteum and ovarian activity.' },
      { title: 'Uterus', text: 'Size, tone and the condition of the endometrium.' },
      { title: 'Cervix', text: 'Its appearance and degree of relaxation.' },
      {
        title: 'Uterine health',
        text: 'Detecting infections or changes that could affect fertility.',
      },
    ],
    whyTitle: 'Why it matters',
    why: 'Knowing where the mare is in her cycle lets us choose the right moment for insemination, spot possible problems early and plan individual reproductive management, improving the chances of a successful pregnancy.',
    closing: 'Every mare is different. Every cycle counts.',
    cta: 'Book a reproductive evaluation',
    footnote: 'Health today. Futures tomorrow.',
  },
}
