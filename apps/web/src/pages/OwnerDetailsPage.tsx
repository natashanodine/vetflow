import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOwnerById } from '../api/clinic'
import type { Owner } from '../types/clinic'

export default function OwnerDetailsPage() {
  const { ownerId } = useParams()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ownerId) return

    let isActive = true

    getOwnerById(ownerId)
      .then((ownerData) => {
        if (isActive) setOwner(ownerData)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load owner',
        )
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [ownerId])

  if (!ownerId) return <PageMessage message="Owner ID is missing" isError />
  if (isLoading) return <PageMessage message="Loading owner…" />
  if (error || !owner) {
    return <PageMessage message={error ?? 'Owner not found'} isError />
  }

  return (
    <div className="space-y-6">
      <Link
        to="/owners"
        className="inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        ← Back to owners
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="font-semibold text-teal-600">Owner profile</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {owner.firstName} {owner.lastName}
        </h1>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Phone" value={owner.phone} />
          <Detail label="Email" value={owner.email ?? 'Not recorded'} />
          <Detail label="Address" value={owner.address ?? 'Not recorded'} />
          <Detail
            label="Patients"
            value={String(owner.patients.length)}
          />
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Patients</h2>

        {owner.patients.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            This owner has no registered patients.
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {owner.patients.map((patient) => (
              <Link
                key={patient.id}
                to={`/patients/${patient.id}`}
                className="rounded-xl border border-slate-200 p-5 transition hover:border-teal-300 hover:bg-teal-50/30"
              >
                <p className="text-lg font-bold text-slate-900">
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
      </section>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-400">{label}</dt>
      <dd className="mt-1 break-words font-semibold text-slate-800">{value}</dd>
    </div>
  )
}

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function PageMessage({
  message,
  isError = false,
}: {
  message: string
  isError?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-10 text-center shadow-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-700'
          : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      {message}
    </div>
  )
}
