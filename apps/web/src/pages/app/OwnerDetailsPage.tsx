import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOwnerById, updateOwner } from '../../api/clinic'
import { useCan } from '../../components/ViewerProvider'
import type { Owner } from '../../types/clinic'

export default function OwnerDetailsPage() {
  const { ownerId } = useParams<{ ownerId: string }>()
  const [owner, setOwner] = useState<Owner | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const canEditRecords = useCan('editRecords')

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
        to="/app/owners"
        className="inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        ← Back to owners
      </Link>

      {isEditing ? (
        <OwnerEditForm
          owner={owner}
          onCancel={() => setIsEditing(false)}
          onSaved={(updated) => {
            setOwner(updated)
            setIsEditing(false)
          }}
        />
      ) : (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-teal-600">Owner profile</p>
              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                {owner.firstName} {owner.lastName}
              </h1>
            </div>
            {canEditRecords && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Edit owner
              </button>
            )}
          </div>

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
      )}

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
                to={`/app/patients/${patient.id}`}
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

function OwnerEditForm({
  owner,
  onCancel,
  onSaved,
}: {
  owner: Owner
  onCancel: () => void
  onSaved: (owner: Owner) => void
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    setIsSaving(true)
    setError(null)

    try {
      onSaved(
        await updateOwner(owner.id, {
          firstName: text('firstName'),
          lastName: text('lastName'),
          phone: text('phone'),
          email: text('email'),
          address: text('address'),
        }),
      )
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : 'Unable to save the owner',
      )
      setIsSaving(false)
    }
  }

  const inputStyles =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'

  return (
    <form
      onSubmit={(formEvent) => void handleSubmit(formEvent)}
      className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
    >
      <p className="font-semibold text-teal-600">Edit owner</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">
        {owner.firstName} {owner.lastName}
      </h1>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {(
          [
            ['firstName', 'First name', owner.firstName, true, 100, 'text'],
            ['lastName', 'Last name', owner.lastName, true, 100, 'text'],
            ['phone', 'Phone', owner.phone, true, 30, 'tel'],
            ['email', 'Email', owner.email ?? '', false, 255, 'email'],
          ] as const
        ).map(([name, label, value, required, maxLength, type]) => (
          <label key={name} className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              {label}
            </span>
            <input
              name={name}
              type={type}
              required={required}
              maxLength={maxLength}
              defaultValue={value}
              disabled={isSaving}
              className={inputStyles}
            />
          </label>
        ))}
        <label className="block md:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Address
          </span>
          <input
            name="address"
            maxLength={500}
            defaultValue={owner.address ?? ''}
            disabled={isSaving}
            className={inputStyles}
          />
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
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
