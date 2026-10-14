import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPatientById } from '../api/clinic'
import type { Patient } from '../types/clinic'

export default function PatientDetailsPage() {
  const { patientId } = useParams()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!patientId) return

    let isActive = true

    getPatientById(patientId)
      .then((patientData) => {
        if (isActive) setPatient(patientData)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load patient',
        )
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })

    return () => {
      isActive = false
    }
  }, [patientId])

  if (!patientId) return <PageMessage message="Patient ID is missing" isError />
  if (isLoading) return <PageMessage message="Loading patient…" />
  if (error || !patient) {
    return <PageMessage message={error ?? 'Patient not found'} isError />
  }

  return (
    <div className="space-y-6">
      <Link
        to="/patients"
        className="inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        ← Back to patients
      </Link>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-teal-600">
              {formatLabel(patient.species)} patient
            </p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              {patient.name}
            </h1>
            <p className="mt-2 text-slate-500">
              {patient.breed ?? 'Breed not recorded'}
            </p>
          </div>

          <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
            {formatLabel(patient.sex)}
          </span>
        </div>

        <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Detail label="Date of birth" value={formatDate(patient.dateOfBirth)} />
          <Detail label="Color" value={patient.color ?? 'Not recorded'} />
          <Detail
            label="Microchip"
            value={patient.microchip ?? 'Not recorded'}
          />
          <Detail
            label="Neutered / castrated"
            value={patient.isNeutered ? 'Yes' : 'No'}
          />
          <Detail label="Patient ID" value={patient.id} />
        </dl>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Owner
          </p>
          <Link
            to={`/owners/${patient.owner.id}`}
            className="mt-2 block text-lg font-bold text-slate-900 hover:text-teal-600"
          >
            {patient.owner.firstName} {patient.owner.lastName}
          </Link>
          <p className="mt-2 text-sm text-slate-500">{patient.owner.phone}</p>
          <p className="text-sm text-slate-500">
            {patient.owner.email ?? 'No email recorded'}
          </p>
        </div>

        <PlaceholderPanel
          title="Medical history"
          message="Examinations, diagnoses and procedures will appear here."
        />
        <PlaceholderPanel
          title="Upcoming care"
          message="Appointments and care tasks will appear here."
        />
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

function PlaceholderPanel({ title, message }: { title: string; message: string }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </section>
  )
}

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function formatDate(date: string | null) {
  if (!date) return 'Not recorded'
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
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
