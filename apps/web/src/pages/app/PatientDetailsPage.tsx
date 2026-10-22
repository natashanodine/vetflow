import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getOwners, getPatientById, updatePatient } from '../../api/clinic'
import { getVets } from '../../api/identity'
import { getAppointments } from '../../api/schedule'
import AppointmentDetailsModal from '../../components/AppointmentDetailsModal'
import AttachmentsPanel from '../../components/AttachmentsPanel'
import MedicalHistoryPanel from '../../components/MedicalHistoryPanel'
import MedicationsPanel from '../../components/MedicationsPanel'
import { useCan } from '../../components/ViewerProvider'
import { appointmentToCalendarEvent } from '../../data/calendarEvents'
import type { CalendarEvent } from '../../data/calendarEvents'
import type { Owner, Patient, Vet } from '../../types/clinic'
import type { Appointment } from '../../types/schedule'

const speciesOptions = ['DOG', 'CAT', 'HORSE', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER']

export default function PatientDetailsPage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [patient, setPatient] = useState<Patient | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [now] = useState(() => Date.now())
  const [activeMedicationCount, setActiveMedicationCount] = useState(0)
  /** Bumped after a visit is completed here, to reload what it may have changed. */
  const [visitVersion, setVisitVersion] = useState(0)
  const canEditRecords = useCan('editRecords')

  useEffect(() => {
    if (!patientId) return

    let isActive = true

    getAppointments({ patientId })
      .then((appointmentData) => {
        if (isActive) setAppointments(appointmentData)
      })
      .catch(() => {
        // The rest of the page still works without the appointment list.
      })

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

  const upcoming = appointments.filter(
    (appointment) =>
      new Date(appointment.startsAt).getTime() >= now &&
      appointment.status === 'SCHEDULED',
  )
  const past = appointments
    .filter((appointment) => !upcoming.includes(appointment))
    .reverse()
  // Newest first for the "link to appointment" pickers.
  const appointmentsNewestFirst = [...appointments].reverse()
  const selectedAppointment = selectedEvent
    ? appointments.find((appointment) => appointment.id === selectedEvent.id)
    : undefined

  return (
    <div className="space-y-6">
      <Link
        to="/app/patients"
        className="inline-flex text-sm font-semibold text-teal-700 hover:text-teal-800"
      >
        ← Back to patients
      </Link>

      {isEditing ? (
        <PatientEditForm
          patient={patient}
          onCancel={() => setIsEditing(false)}
          onSaved={(updated) => {
            setPatient(updated)
            setIsEditing(false)
          }}
        />
      ) : (
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

            <div className="flex items-center gap-3">
              {activeMedicationCount > 0 && (
                <a
                  href="#medications-title"
                  className="rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  On medication
                </a>
              )}
              <span className="rounded-full bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">
                {formatLabel(patient.sex)}
              </span>
              {canEditRecords && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Edit patient
                </button>
              )}
            </div>
          </div>

          <dl className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Detail
              label="Date of birth"
              value={formatBirthDate(patient.dateOfBirth)}
            />
            <Detail label="Color" value={patient.color ?? 'Not recorded'} />
            <Detail
              label="Microchip"
              value={patient.microchip ?? 'Not recorded'}
            />
            <Detail
              label="Weight"
              value={patient.weightKg != null ? `${patient.weightKg} kg` : 'Not recorded'}
            />
            <Detail
              label="Neutered / castrated"
              value={patient.isNeutered ? 'Yes' : 'No'}
            />
            <Detail
              label="Responsible vet"
              value={patient.responsibleVet?.name ?? 'Not assigned'}
            />
          </dl>
        </section>
      )}

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Owner
          </p>
          <Link
            to={`/app/owners/${patient.owner.id}`}
            className="mt-2 block text-lg font-bold text-slate-900 hover:text-teal-600"
          >
            {patient.owner.firstName} {patient.owner.lastName}
          </Link>
          <p className="mt-2 text-sm text-slate-500">{patient.owner.phone}</p>
          <p className="text-sm text-slate-500">
            {patient.owner.email ?? 'No email recorded'}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-slate-900">Appointments</h2>
            <Link
              to="/app/agenda"
              className="text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
            >
              Book in agenda →
            </Link>
          </div>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            <AppointmentList
              title="Upcoming"
              appointments={upcoming}
              emptyMessage="Nothing scheduled."
              onSelect={(appointment) =>
                setSelectedEvent(appointmentToCalendarEvent(appointment))
              }
            />
            <AppointmentList
              title="Past"
              appointments={past.slice(0, 5)}
              emptyMessage="No past appointments."
              onSelect={(appointment) =>
                setSelectedEvent(appointmentToCalendarEvent(appointment))
              }
            />
          </div>
        </div>
      </section>

      <MedicationsPanel
        key={`medications-${visitVersion}`}
        patientId={patient.id}
        onActiveCountChange={setActiveMedicationCount}
      />

      <MedicalHistoryPanel
        key={`history-${visitVersion}`}
        patientId={patient.id}
        appointments={appointmentsNewestFirst}
      />

      <AttachmentsPanel
        patientId={patient.id}
        appointments={appointmentsNewestFirst}
      />

      {selectedEvent && selectedAppointment && (
        <AppointmentDetailsModal
          key={selectedEvent.id}
          event={selectedEvent}
          appointment={selectedAppointment}
          onClose={() => setSelectedEvent(null)}
          onDeleted={(deletedIds) => {
            setAppointments((current) =>
              current.filter((appointment) => !deletedIds.includes(appointment.id)),
            )
            setSelectedEvent(null)
          }}
          onBooked={(booked) =>
            setAppointments((current) =>
              [...current, ...booked].filter((appointment) => appointment.patientId === patient.id),
            )
          }
          onUpdated={(updatedAppointment) => {
            if (
              updatedAppointment.status === 'COMPLETED' &&
              selectedAppointment.status !== 'COMPLETED'
            ) {
              // The visit may have recorded a weight, history and medications.
              setVisitVersion((version) => version + 1)
              getPatientById(patient.id)
                .then(setPatient)
                .catch(() => undefined)
            }
            setAppointments((current) =>
              current
                .map((appointment) =>
                  appointment.id === updatedAppointment.id
                    ? updatedAppointment
                    : appointment,
                )
                .filter((appointment) => appointment.patientId === patient.id),
            )
            setSelectedEvent(appointmentToCalendarEvent(updatedAppointment))
          }}
        />
      )}
    </div>
  )
}

function PatientEditForm({
  patient,
  onCancel,
  onSaved,
}: {
  patient: Patient
  onCancel: () => void
  onSaved: (patient: Patient) => void
}) {
  const [owners, setOwners] = useState<Owner[]>([])
  const [vets, setVets] = useState<Vet[]>([])
  // Controlled so the choice survives the option lists loading in later.
  const [ownerId, setOwnerId] = useState(patient.ownerId)
  const [responsibleVetId, setResponsibleVetId] = useState(
    patient.responsibleVetId ?? '',
  )
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isActive = true
    getOwners()
      .then((ownerData) => {
        if (isActive) setOwners(ownerData)
      })
      .catch(() => {
        // The current owner stays selectable even if the list fails to load.
      })
    getVets()
      .then((vetData) => {
        if (isActive) setVets(vetData)
      })
      .catch(() => {
        // The current vet stays selectable even if the list fails to load.
      })
    return () => {
      isActive = false
    }
  }, [])

  async function handleSubmit(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    const form = new FormData(formEvent.currentTarget)
    const text = (name: string) => String(form.get(name) ?? '').trim()
    setIsSaving(true)
    setError(null)

    try {
      const updated = await updatePatient(patient.id, {
        ownerId: text('ownerId'),
        name: text('name'),
        species: text('species'),
        sex: text('sex'),
        isNeutered: text('isNeutered') === 'true',
        breed: text('breed'),
        dateOfBirth: text('dateOfBirth'),
        color: text('color'),
        microchip: text('microchip'),
        weightKg: text('weightKg') ? parseFloat(text('weightKg')) : null,
        responsibleVetId: text('responsibleVetId') || null,
      })
      onSaved(updated)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save the patient',
      )
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={(formEvent) => void handleSubmit(formEvent)}
      className="rounded-2xl border border-teal-200 bg-white p-6 shadow-sm"
    >
      <p className="font-semibold text-teal-600">Edit patient</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">{patient.name}</h1>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Field label="Name">
          <input
            name="name"
            required
            maxLength={100}
            defaultValue={patient.name}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Species">
          <select
            name="species"
            defaultValue={patient.species}
            disabled={isSaving}
            className={inputStyles}
          >
            {speciesOptions.map((species) => (
              <option key={species} value={species}>
                {formatLabel(species)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Breed">
          <input
            name="breed"
            maxLength={100}
            defaultValue={patient.breed ?? ''}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Sex">
          <select
            name="sex"
            defaultValue={patient.sex}
            disabled={isSaving}
            className={inputStyles}
          >
            <option value="FEMALE">Female</option>
            <option value="MALE">Male</option>
            <option value="UNKNOWN">Unknown</option>
          </select>
        </Field>
        <Field label="Neutered / castrated">
          <select
            name="isNeutered"
            defaultValue={String(patient.isNeutered)}
            disabled={isSaving}
            className={inputStyles}
          >
            <option value="false">No</option>
            <option value="true">Yes</option>
          </select>
        </Field>
        <Field label="Date of birth">
          <input
            name="dateOfBirth"
            type="date"
            max={new Date().toISOString().slice(0, 10)}
            defaultValue={patient.dateOfBirth?.slice(0, 10) ?? ''}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Color">
          <input
            name="color"
            maxLength={100}
            defaultValue={patient.color ?? ''}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Microchip">
          <input
            name="microchip"
            maxLength={100}
            defaultValue={patient.microchip ?? ''}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Weight (kg)">
          <input
            name="weightKg"
            type="number"
            min={0}
            max={2000}
            step="0.1"
            defaultValue={patient.weightKg ?? ''}
            disabled={isSaving}
            className={inputStyles}
          />
        </Field>
        <Field label="Responsible vet">
          <select
            name="responsibleVetId"
            value={responsibleVetId}
            onChange={(changeEvent) => setResponsibleVetId(changeEvent.target.value)}
            disabled={isSaving}
            className={inputStyles}
          >
            <option value="">Not assigned</option>
            {patient.responsibleVet &&
              !vets.some((vet) => vet.id === patient.responsibleVetId) && (
                <option value={patient.responsibleVet.id}>
                  {patient.responsibleVet.name}
                </option>
              )}
            {vets.map((vet) => (
              <option key={vet.id} value={vet.id}>
                {vet.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Owner">
          <select
            name="ownerId"
            value={ownerId}
            onChange={(changeEvent) => setOwnerId(changeEvent.target.value)}
            disabled={isSaving}
            className={inputStyles}
          >
            {!owners.some((owner) => owner.id === patient.ownerId) && (
              <option value={patient.ownerId}>
                {patient.owner.firstName} {patient.owner.lastName}
              </option>
            )}
            {owners.map((owner) => (
              <option key={owner.id} value={owner.id}>
                {owner.firstName} {owner.lastName}
                {owner.email ? ` · ${owner.email}` : ''}
              </option>
            ))}
          </select>
        </Field>
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

function AppointmentList({
  title,
  appointments,
  emptyMessage,
  onSelect,
}: {
  title: string
  appointments: Appointment[]
  emptyMessage: string
  onSelect: (appointment: Appointment) => void
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </p>
      {appointments.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{emptyMessage}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              <button
                type="button"
                onClick={() => onSelect(appointment)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-left transition hover:border-teal-300 hover:bg-teal-50/40"
              >
                <span className="block text-sm font-semibold text-slate-900">
                  {appointment.title}
                </span>
                <span className="block text-xs text-slate-500">
                  {formatDateTime(appointment.startsAt)} ·{' '}
                  {formatLabel(appointment.status)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      {children}
    </label>
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

function formatBirthDate(date: string | null) {
  if (!date) return 'Not recorded'
  const formatted = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(date))
  return `${formatted} (${formatAge(date)})`
}

function formatAge(date: string) {
  const birth = new Date(date)
  const today = new Date()
  let months =
    (today.getFullYear() - birth.getUTCFullYear()) * 12 +
    (today.getMonth() - birth.getUTCMonth())
  if (today.getDate() < birth.getUTCDate()) months -= 1
  if (months < 1) return 'under 1 month'
  if (months < 24) return `${months} ${months === 1 ? 'month' : 'months'}`
  return `${Math.floor(months / 12)} years`
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
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
      className={`rounded-2xl border p-10 text-center shadow-sm ${isError
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-slate-200 bg-white text-slate-500'
        }`}
    >
      {message}
    </div>
  )
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'
