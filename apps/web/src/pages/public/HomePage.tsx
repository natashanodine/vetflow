import { Link } from 'react-router-dom'

const services = [
  {
    number: '01',
    title: 'Preventive care & wellness',
    text: 'Vaccination and deworming plans, dental care, annual health checks and nutrition advice suited to each horse’s age and work.',
  },
  {
    number: '02',
    title: 'Mare reproduction',
    text: 'Breeding soundness exams, ultrasound follicle monitoring, artificial insemination timed to ovulation and early pregnancy diagnosis.',
  },
  {
    number: '03',
    title: 'Stallion services',
    text: 'Breeding soundness evaluations, semen collection and semen quality assessment before and during the breeding season.',
  },
  {
    number: '04',
    title: 'Foals & neonatal care',
    text: 'Support around foaling, newborn examinations and close follow-up through the foal’s first months.',
  },
  {
    number: '05',
    title: 'Diagnostics & treatment',
    text: 'Lameness and clinical examinations, treatment plans and organized follow-up through recovery.',
  },
]

const breedingSteps = [
  {
    title: 'Pre-breeding exam',
    text: 'A reproductive check of the mare before the season to plan the best approach.',
  },
  {
    title: 'Cycle monitoring',
    text: 'Regular ultrasound scans follow the mare’s cycle and follicle growth.',
  },
  {
    title: 'Breeding at the right time',
    text: 'Insemination or natural cover is timed as close to ovulation as possible.',
  },
  {
    title: 'Pregnancy confirmation',
    text: 'An early ultrasound about two weeks after ovulation, then follow-up scans to confirm a healthy pregnancy.',
  },
  {
    title: 'Foaling & beyond',
    text: 'Support as the due date approaches and a full check of mare and foal after birth.',
  },
]

export default function HomePage() {
  return (
    <>
      <section className="paper-grid overflow-hidden border-b border-[#17352f]/10">
        <div className="mx-auto grid min-h-[690px] max-w-7xl items-center gap-14 px-5 py-20 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div>
            <p className="eyebrow text-[#d86f52]">
              Equine veterinary care & reproduction
            </p>
            <h1 className="mt-6 max-w-3xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] md:text-7xl">
              Expert care for every stage of a horse’s life.
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-[#46645d]">
              Equora brings preventive medicine, reproductive management and
              attentive follow-up together, for mares, stallions, foals and the
              people who look after them.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                to="/#contact"
                className="rounded-full bg-[#174f45] px-6 py-3.5 font-bold text-white transition hover:bg-[#103e36]"
              >
                Book a visit
              </Link>
              <Link
                to="/services"
                className="rounded-full border border-[#174f45]/25 bg-white/60 px-6 py-3.5 font-bold transition hover:border-[#174f45]"
              >
                Explore services
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl pb-10 pt-6">
            <div className="absolute left-0 top-0 h-56 w-56 rounded-full bg-[#dce9df]" />
            <div className="absolute bottom-0 right-0 h-48 w-48 rounded-full bg-[#f0c9b9]" />
            <div className="relative ml-auto w-[88%] rounded-[2.5rem] bg-[#174f45] p-7 text-white shadow-2xl shadow-[#174f45]/20 md:p-10">
              <div className="flex items-center justify-between border-b border-white/15 pb-7">
                <span className="eyebrow text-[#b8d3c5]">Who we care for</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                  className="h-7 w-7 text-[#e59779]"
                >
                  <path
                    d="M6.5 20.5c-1.6-2.1-2.5-4.7-2.5-7.5C4 8 7.6 4 12 4s8 4 8 9c0 2.8-.9 5.4-2.5 7.5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <div className="py-9">
                <p className="font-display text-4xl font-semibold leading-tight">
                  Healthy horses.
                  <br />
                  Successful seasons.
                </p>
                <p className="mt-5 text-sm leading-6 text-white/70">
                  From routine wellness to the full breeding cycle, every
                  exam, scan and result is recorded so each visit builds on
                  the last.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {['Mares', 'Stallions', 'Foals'].map((label) => (
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
            <p className="eyebrow text-[#d86f52]">What we do</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              Complete care, with a focus on reproduction.
            </h2>
            <p className="mt-5 max-w-sm leading-7 text-[#56736c]">
              Whether you have one horse or a breeding program, care is planned
              around the horse, the season and your goals.
            </p>
          </div>
          <div className="divide-y divide-[#17352f]/15 border-y border-[#17352f]/15">
            {services.map((service) => (
              <article key={service.number} className="grid gap-5 py-7 sm:grid-cols-[60px_1fr]">
                <span className="font-display text-2xl text-[#d86f52]">
                  {service.number}
                </span>
                <div>
                  <h3 className="text-2xl font-semibold">{service.title}</h3>
                  <p className="mt-2 max-w-2xl leading-7 text-[#56736c]">
                    {service.text}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#17352f] text-white">
        <div className="mx-auto max-w-7xl px-5 py-24 lg:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow text-[#e59779]">Reproduction</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
              A breeding season, step by step.
            </h2>
            <p className="mt-5 leading-7 text-white/70">
              Good timing is everything in equine reproduction. We follow each
              mare closely so that every decision is based on what the scans
              show.
            </p>
          </div>

          <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {breedingSteps.map((step, index) => (
              <li
                key={step.title}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6"
              >
                <span className="font-display text-3xl text-[#e59779]">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-white/70">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-[#efe7d9]">
        <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 lg:grid-cols-2 lg:px-8">
          <div className="rounded-[2rem] bg-[#d86f52] p-9 text-white md:p-12">
            <p className="eyebrow text-white/75">For horse owners & breeders</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight">
              Every horse’s history, in one place.
            </h2>
            <p className="mt-5 leading-7 text-white/85">
              Examinations, treatments, vaccinations, scans and lab results are
              kept together in each horse’s record, so nothing is lost between
              visits or from one season to the next.
            </p>
          </div>
          <div className="flex flex-col justify-center">
            <p className="eyebrow text-[#174f45]">Meet the team</p>
            <h2 className="mt-5 text-4xl font-semibold leading-tight md:text-5xl">
              People who love working with horses.
            </h2>
            <p className="mt-5 max-w-xl leading-7 text-[#56736c]">
              Get to know the veterinarians and team behind Equora, and how we
              approach the care of every horse.
            </p>
            <Link to="/team" className="mt-7 font-bold text-[#174f45] underline decoration-[#d86f52] decoration-2 underline-offset-8">
              Meet the team →
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
