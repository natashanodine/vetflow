import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOwners } from '../../api/clinic'
import type { Owner } from '../../types/clinic'

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    getOwners()
      .then((ownerData) => {
        if (isActive) setOwners(ownerData)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load owners',
        )
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [])

  const normalizedSearch = search.trim().toLowerCase()
  const filteredOwners = owners.filter((owner) => {
    const searchableText = [
      owner.firstName,
      owner.lastName,
      owner.email,
      owner.phone,
      ...owner.patients.map((patient) => patient.name),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return searchableText.includes(normalizedSearch)
  })

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-600">Client records</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Owners</h1>
          <p className="mt-2 text-slate-500">
            Select an owner to reveal their patients.
          </p>
        </div>

        <label className="w-full max-w-sm text-left">
          <span className="sr-only">Search owners</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search owner or patient"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          <p className="font-semibold">Owners could not be loaded</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      )}

      {isLoading ? (
        <PageMessage message="Loading owners…" />
      ) : filteredOwners.length === 0 ? (
        <PageMessage
          message={
            search ? 'No owners match your search.' : 'No owners registered yet.'
          }
        />
      ) : (
        <section className="space-y-4">
          {filteredOwners.map((owner) => (
            <details
              key={owner.id}
              className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 hover:bg-slate-50">
                <div className="text-left">
                  <h2 className="text-lg font-bold text-slate-900">
                    {owner.firstName} {owner.lastName}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {owner.email ?? 'No email'} · {owner.phone}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
                    {owner.patients.length}{' '}
                    {owner.patients.length === 1 ? 'patient' : 'patients'}
                  </span>
                  <span className="text-xl text-slate-400 transition group-open:rotate-180">
                    ▾
                  </span>
                </div>
              </summary>

              <div className="border-t border-slate-200 bg-slate-50/60 p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-slate-600">
                    {owner.address ?? 'No address recorded'}
                  </p>
                  <Link
                    to={`/app/owners/${owner.id}`}
                    className="text-sm font-semibold text-teal-700 hover:text-teal-800"
                  >
                    Open owner profile →
                  </Link>
                </div>

                {owner.patients.length === 0 ? (
                  <p className="rounded-lg bg-white p-4 text-sm text-slate-500">
                    No patients are related to this owner.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {owner.patients.map((patient) => (
                      <Link
                        key={patient.id}
                        to={`/app/patients/${patient.id}`}
                        className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-300 hover:shadow-sm"
                      >
                        <p className="font-bold text-slate-900">
                          {patient.name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {formatLabel(patient.species)}
                          {patient.breed ? ` · ${patient.breed}` : ''}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </details>
          ))}
        </section>
      )}
    </div>
  )
}

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function PageMessage({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
      {message}
    </div>
  )
}
