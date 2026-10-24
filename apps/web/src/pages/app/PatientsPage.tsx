import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMedications, getPatients } from '../../api/clinic'
import type { Patient } from '../../types/clinic'
import { formatAge } from '../../lib/age'

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [search, setSearch] = useState('')
  const [vetFilter, setVetFilter] = useState('ALL')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  /** Patients with a current medication. */
  const [medicated, setMedicated] = useState<ReadonlySet<string>>(new Set())

  useEffect(() => {
    let isActive = true

    getActiveMedications()
      .then((medications) => {
        if (isActive) setMedicated(new Set(medications.map((medication) => medication.patientId)))
      })
      .catch(() => undefined)

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

  const vets = [
    ...new Map(
      patients
        .filter((patient) => patient.responsibleVet)
        .map((patient) => [patient.responsibleVet!.id, patient.responsibleVet!]),
    ).values(),
  ].sort((left, right) => left.name.localeCompare(right.name))

  const normalizedSearch = search.trim().toLowerCase()
  const filteredPatients = patients.filter((patient) => {
    if (vetFilter === 'NONE' && patient.responsibleVetId) return false
    if (
      vetFilter !== 'ALL' &&
      vetFilter !== 'NONE' &&
      patient.responsibleVetId !== vetFilter
    ) {
      return false
    }

    const searchableText = [
      patient.name,
      patient.species,
      patient.breed,
      patient.owner.firstName,
      patient.owner.lastName,
      patient.responsibleVet?.name,
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

        <div className="flex w-full max-w-xl flex-wrap gap-2 sm:flex-nowrap">
          <label className="w-full sm:w-56">
            <span className="sr-only">Filter by responsible vet</span>
            <select
              value={vetFilter}
              onChange={(event) => setVetFilter(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              <option value="ALL">All vets</option>
              {vets.map((vet) => (
                <option key={vet.id} value={vet.id}>
                  {vet.name}
                </option>
              ))}
              <option value="NONE">No vet assigned</option>
            </select>
          </label>
          <label className="w-full text-left">
            <span className="sr-only">Search patients</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, species, breed, owner or vet"
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>
      </section>

      {error && <ErrorMessage message={error} />}

      {isLoading ? (
        <PageMessage message="Loading patients…" />
      ) : filteredPatients.length === 0 ? (
        <PageMessage
          message={
            search || vetFilter !== 'ALL'
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
                    to={`/app/patients/${patient.id}`}
                    className="text-xl font-bold text-slate-900 hover:text-teal-600"
                  >
                    {patient.name}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatLabel(patient.species)}
                    {patient.breed ? ` · ${patient.breed}` : ''}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
                    {formatLabel(patient.sex)}
                  </span>
                  {medicated.has(patient.id) && (
                    <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700">
                      On medication
                    </span>
                  )}
                </div>
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

              <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Owner
                  </p>
                  <Link
                    to={`/app/owners/${patient.owner.id}`}
                    className="mt-1 inline-block font-semibold text-slate-700 hover:text-teal-600"
                  >
                    {patient.owner.firstName} {patient.owner.lastName}
                  </Link>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Responsible vet
                  </p>
                  <p
                    className={`mt-1 font-semibold ${
                      patient.responsibleVet ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {patient.responsibleVet?.name ?? 'Not assigned'}
                  </p>
                </div>
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
