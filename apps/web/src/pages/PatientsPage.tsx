import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPatients } from '../api/clinic'
import type { Patient } from '../types/clinic'

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true

    getPatients()
      .then((patientData) => {
        if (isActive) setPatients(patientData)
      })
      .catch((loadError: unknown) => {
        if (!isActive) return
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load patients',
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
  const filteredPatients = patients.filter((patient) => {
    const searchableText = [
      patient.name,
      patient.species,
      patient.breed,
      patient.owner.firstName,
      patient.owner.lastName,
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
          <p className="font-semibold text-teal-600">Clinic records</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Patients</h1>
          <p className="mt-2 text-slate-500">
            {patients.length} registered{' '}
            {patients.length === 1 ? 'patient' : 'patients'}
          </p>
        </div>

        <label className="w-full max-w-sm text-left">
          <span className="sr-only">Search patients</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, species, breed or owner"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
          />
        </label>
      </section>

      {error && <ErrorMessage message={error} />}

      {isLoading ? (
        <PageMessage message="Loading patients…" />
      ) : filteredPatients.length === 0 ? (
        <PageMessage
          message={
            search
              ? 'No patients match your search.'
              : 'No patients registered yet.'
          }
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredPatients.map((patient) => (
            <article
              key={patient.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link
                    to={`/patients/${patient.id}`}
                    className="text-xl font-bold text-slate-900 hover:text-teal-600"
                  >
                    {patient.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatLabel(patient.species)}
                    {patient.breed ? ` · ${patient.breed}` : ''}
                  </p>
                </div>

                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                  {formatLabel(patient.sex)}
                </span>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                <PatientFact
                  label="Age"
                  value={formatAge(patient.dateOfBirth)}
                />
                <PatientFact
                  label="Color"
                  value={patient.color ?? 'Not recorded'}
                />
                <PatientFact
                  label="Microchip"
                  value={patient.microchip ?? 'Not recorded'}
                />
                <PatientFact
                  label="Neutered / castrated"
                  value={patient.isNeutered ? 'Yes' : 'No'}
                />
              </dl>

              <div className="mt-5 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Owner
                </p>
                <Link
                  to={`/owners/${patient.owner.id}`}
                  className="mt-1 inline-block font-semibold text-slate-700 hover:text-teal-600"
                >
                  {patient.owner.firstName} {patient.owner.lastName}
                </Link>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  )
}

function PatientFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium text-slate-700">{value}</dd>
    </div>
  )
}

function formatAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return 'Unknown'

  const birthDate = new Date(dateOfBirth)
  const today = new Date()
  let years = today.getFullYear() - birthDate.getUTCFullYear()
  const birthdayHasPassed =
    today.getMonth() > birthDate.getUTCMonth() ||
    (today.getMonth() === birthDate.getUTCMonth() &&
      today.getDate() >= birthDate.getUTCDate())

  if (!birthdayHasPassed) years -= 1
  return `${years} ${years === 1 ? 'year' : 'years'}`
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

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
      <p className="font-semibold">Patients could not be loaded</p>
      <p className="mt-1 text-sm">{message}</p>
    </div>
  )
}
