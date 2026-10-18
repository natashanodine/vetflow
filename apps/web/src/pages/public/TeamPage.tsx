
export default function TeamPage() {
  return (
    <>
      <section className="paper-grid border-b border-[#17352f]/10">
        <div className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="eyebrow text-[#d86f52]">Our team</p>
          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight md:text-7xl">
            The people behind Equora.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#56736c]">
            Equine veterinarians and a supporting team who care about every
            horse, every owner and every season.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2">
          <div className="min-h-96 rounded-[2rem] bg-[#dce9df] p-8 md:p-10">
            <div className="grid h-full place-items-center rounded-[1.5rem] border border-dashed border-[#174f45]/30 text-center">
              <div>
                <p className="font-display text-3xl font-semibold">Veterinarian profile</p>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#56736c]">
                  Portrait, name, qualifications, specialties and professional
                  story will appear here.
                </p>
              </div>
            </div>
          </div>
          <div className="min-h-96 rounded-[2rem] bg-[#efe7d9] p-8 md:p-10">
            <div className="grid h-full place-items-center rounded-[1.5rem] border border-dashed border-[#174f45]/25 text-center">
              <div>
                <p className="font-display text-3xl font-semibold">Supporting team</p>
                <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-[#56736c]">
                  Team names, roles, experience and real clinic photography can
                  be managed from the application later.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
