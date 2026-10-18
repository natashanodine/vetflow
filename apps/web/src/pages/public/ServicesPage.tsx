import { Link } from 'react-router-dom'

const serviceGroups = [
  {
    title: 'Preventive care & wellness',
    description:
      'Regular care that keeps horses healthy, sound and ready for their work.',
    items: [
      'Vaccination and deworming plans',
      'Dental care',
      'Annual health checks',
      'Nutrition and body condition advice',
    ],
  },
  {
    title: 'Mare reproduction',
    description:
      'Close monitoring through the season, so breeding is timed precisely.',
    items: [
      'Pre-breeding examinations',
      'Ultrasound follicle monitoring',
      'Artificial insemination',
      'Pregnancy diagnosis and follow-up scans',
    ],
  },
  {
    title: 'Stallion services',
    description:
      'Evaluations that help plan a stallion’s breeding season with confidence.',
    items: [
      'Breeding soundness evaluations',
      'Semen collection',
      'Semen quality assessment',
    ],
  },
  {
    title: 'Foals & neonatal care',
    description:
      'Support for mare and foal around birth and through the first months.',
    items: [
      'Pre-foaling checks',
      'Newborn foal examinations',
      'Early growth and health follow-up',
    ],
  },
  {
    title: 'Diagnostics & treatment',
    description:
      'Clear answers when something is wrong, and a plan to get back on track.',
    items: [
      'Lameness and clinical examinations',
      'Treatment planning',
      'Recovery and medication follow-up',
    ],
  },
]

export default function ServicesPage() {
  return (
    <>
      <section className="paper-grid border-b border-[#17352f]/10">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow text-[#d86f52]">Our services</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
            Equine care, from wellness to the next generation.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#56736c]">
            Preventive medicine, reproduction and follow-up care for mares,
            stallions and foals, with every visit recorded in the horse’s
            history.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {serviceGroups.map((group, index) => (
            <article
              key={group.title}
              className="rounded-[2rem] border border-[#17352f]/12 bg-white p-7 shadow-sm"
            >
              <span className="font-display text-3xl text-[#d86f52]">0{index + 1}</span>
              <h2 className="mt-7 text-3xl font-semibold">{group.title}</h2>
              <p className="mt-4 leading-7 text-[#56736c]">{group.description}</p>
              <ul className="mt-7 space-y-3 border-t border-[#17352f]/10 pt-6 text-sm font-bold">
                {group.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="text-[#d86f52]">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          ))}

          <article className="flex flex-col justify-between rounded-[2rem] bg-[#174f45] p-7 text-white shadow-sm">
            <div>
              <p className="eyebrow text-[#b8d3c5]">Planning a season?</p>
              <h2 className="mt-5 text-3xl font-semibold">
                Talk to us before breeding starts.
              </h2>
              <p className="mt-4 leading-7 text-white/75">
                An early conversation makes it easier to plan exams, monitoring
                and timing for each mare.
              </p>
            </div>
            <Link
              to="/#contact"
              className="mt-8 inline-flex w-fit rounded-full bg-white px-5 py-3 font-bold text-[#174f45] transition hover:bg-[#dce9df]"
            >
              Contact us
            </Link>
          </article>
        </div>
      </section>
    </>
  )
}
