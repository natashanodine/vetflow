import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getPatients } from '../api/clinic'
import { deleteAppointment, updateAppointment } from '../api/schedule'
import { useCan } from '../auth/hooks'
import AttachmentsPanel from './AttachmentsPanel'
import type { CalendarEvent } from '../data/calendarEvents'
import type { Patient } from '../types/clinic'
import type { Appointment } from '../types/schedule'
import { CLOSED_DAY_MESSAGE, isWeekend } from '../lib/clinicCalendar'

interface AppointmentDetailsModalProps {
  event: CalendarEvent
  appointment: Appointment
  onClose: () => void
  onUpdated: (appointment: Appointment) => void
  /** Called with the ids of every appointment deleted. */
  onDeleted: (appointmentIds: string[]) => void
}

const categoryStyles = {
  APPOINTMENT: 'bg-sky-100 text-sky-800',
  TREATMENT: 'bg-rose-100 text-rose-800',
  REPRODUCTION: 'bg-violet-100 text-violet-800',
}

const statusStyles = {
  SCHEDULED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-200 text-slate-700',
}

export default function AppointmentDetailsModal({
  event,
  appointment,
  onClose,
  onUpdated,
  onDeleted,
}: AppointmentDetailsModalProps) {
  const canDelete = useCan('editRecords')
  const [isEditing, setIsEditing] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const laterInCourse = appointment.treatment
    ? appointment.treatment.stepCount - appointment.treatment.stepNumber
    : 0

  async function handleDelete(scope: 'this' | 'following') {
    setIsDeleting(true)
    setError(null)
    try {
      const { deleted } = await deleteAppointment(appointment.id, scope)
      onDeleted(deleted)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete appointment')
      setIsDeleting(false)
    }
  }
  // Controlled so the choice survives the patient list loading in later.
  const [selectedPatientId, setSelectedPatientId] = useState(
    appointment.patientId,
  )
  const [patients, setPatients] = useState<Patient[]>([])
  const [isLoadingPatients, setIsLoadingPatients] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function closeOnEscape(keyboardEvent: KeyboardEvent) {
      if (keyboardEvent.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  async function beginEditing() {
    setIsEditing(true)
    if (patients.length > 0) return

    setIsLoadingPatients(true)
    setError(null)

    try {
      setPatients(await getPatients())
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load patients',
      )
    } finally {
      setIsLoadingPatients(false)
    }
  }

  async function handleUpdate(formEvent: React.FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()

    setIsSaving(true)
    setError(null)
    const form = new FormData(formEvent.currentTarget)

    try {
      const appointmentDate = requiredValue(form, 'appointmentDate')
      const appointmentTime = requiredValue(form, 'appointmentTime')
      const title = requiredValue(form, 'title')
      const details = String(form.get('details') ?? '').trim()
      const durationMinutes = Number(requiredValue(form, 'durationMinutes'))
      const category = requiredValue(
        form,
        'category',
      ) as CalendarEvent['category']
      const status = requiredValue(
        form,
        'status',
      ) as CalendarEvent['status']

      const startsAt = new Date(`${appointmentDate}T${appointmentTime}:00`)
      const toMinute = (date: Date) => Math.floor(date.getTime() / 60_000)
      const isRescheduled =
        toMinute(startsAt) !== toMinute(new Date(appointment.startsAt))
      if (isRescheduled && startsAt.getTime() < Date.now()) {
        throw new Error('Choose a date and time in the future.')
      }
      if (isRescheduled && isWeekend(startsAt)) {
        throw new Error(CLOSED_DAY_MESSAGE)
      }

      const updatedAppointment = await updateAppointment(appointment.id, {
        patientId: requiredValue(form, 'patientId'),
        title,
        details,
        startsAt: startsAt.toISOString(),
        durationMinutes,
        category,
        status,
      })

      onUpdated(updatedAppointment)
      setIsEditing(false)
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to update appointment',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const dateTime = localDateAndTime(new Date(appointment.startsAt))
  const todayKey = localDateAndTime(new Date()).date

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4"
      onMouseDown={(mouseEvent) => {
        if (mouseEvent.target === mouseEvent.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="appointment-modal-title"
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="font-semibold text-teal-600">
              Appointment details
            </p>
            <h2
              id="appointment-modal-title"
              className="mt-1 text-2xl font-bold text-slate-900"
            >
              {event.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close appointment details"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xl leading-none text-slate-500 hover:bg-slate-50"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {isEditing ? (
            <form onSubmit={(formEvent) => void handleUpdate(formEvent)}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Patient">
                  <select
                    name="patientId"
                    required
                    value={selectedPatientId}
                    onChange={(changeEvent) =>
                      setSelectedPatientId(changeEvent.target.value)
                    }
                    disabled={isLoadingPatients || isSaving}
                    className={inputStyles}
                  >
                    {!patients.some(
                      (patient) => patient.id === appointment.patientId,
                    ) && (
                      <option value={appointment.patientId}>
                        {appointment.patientName}
                      </option>
                    )}
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.name} · {formatLabel(patient.species)} ·{' '}
                        {patient.owner.firstName} {patient.owner.lastName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Title">
                  <input
                    name="title"
                    required
                    defaultValue={event.title}
                    disabled={isSaving}
                    className={inputStyles}
                  />
                </Field>
                <Field label="Type">
                  <select
                    name="category"
                    defaultValue={event.category}
                    disabled={isSaving}
                    className={inputStyles}
                  >
                    <option value="APPOINTMENT">Appointment</option>
                    <option value="TREATMENT">Treatment</option>
                    <option value="REPRODUCTION">Reproduction</option>
                  </select>
                </Field>
                <Field label="Status">
                  <select
                    name="status"
                    defaultValue={event.status}
                    disabled={isSaving}
                    className={inputStyles}
                  >
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </Field>
                <Field label="Date">
                  <input
                    name="appointmentDate"
                    type="date"
                    required
                    min={
                      dateTime.date >= todayKey ? todayKey : undefined
                    }
                    defaultValue={dateTime.date}
                    disabled={isSaving}
                    className={inputStyles}
                  />
                </Field>
                <Field label="Time">
                  <input
                    name="appointmentTime"
                    type="time"
                    required
                    defaultValue={dateTime.time}
                    disabled={isSaving}
                    className={inputStyles}
                  />
                </Field>
                <Field label="Duration">
                  <select
                    name="durationMinutes"
                    defaultValue={String(event.durationMinutes)}
                    disabled={isSaving}
                    className={inputStyles}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="90">1 hour 30 minutes</option>
                    <option value="120">2 hours</option>
                  </select>
                </Field>
              </div>

              <div className="mt-4">
                <Field label="Details">
                  <textarea
                    name="details"
                    rows={4}
                    defaultValue={event.details}
                    disabled={isSaving}
                    className={inputStyles}
                  />
                </Field>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={() => {
                    setError(null)
                    setIsEditing(false)
                  }}
                  className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving || isLoadingPatients}
                  className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyles[event.category]}`}
                >
                  {formatLabel(event.category)}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[event.status]}`}
                >
                  {formatLabel(event.status)}
                </span>
              </div>

              {appointment.treatment && (
                <p className="mt-4 rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-900">
                  Part of the treatment <strong>{appointment.treatment.name}</strong>:
                  appointment {appointment.treatment.stepNumber} of{' '}
                  {appointment.treatment.stepCount}.
                </p>
              )}

              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Patient
                  </dt>
                  <dd className="mt-1">
                    <Link
                      to={`/app/patients/${appointment.patientId}`}
                      className="font-semibold text-teal-700 hover:text-teal-900 hover:underline"
                    >
                      {appointment.patientName} →
                    </Link>
                  </dd>
                </div>
                <Detail
                  label="Date and time"
                  value={formatDateAndTime(event.date, event.time)}
                />
                <Detail
                  label="Duration"
                  value={
                    formatDuration(event.durationMinutes)
                  }
                />
                <Detail
                  label="Last updated"
                  value={
                    new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(appointment.updatedAt))
                  }
                />
              </dl>

              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Details
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                  {event.details || 'No additional details.'}
                </p>
              </div>

              <div className="mt-6">
                <AttachmentsPanel
                  patientId={appointment.patientId}
                  appointmentId={appointment.id}
                  title="Files"
                  compact
                />
              </div>

              {isConfirmingDelete ? (
                <div
                  role="alertdialog"
                  aria-labelledby="delete-appointment-title"
                  className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4"
                >
                  <p id="delete-appointment-title" className="font-bold text-red-900">
                    Delete this appointment?
                  </p>
                  <p className="mt-1 text-sm text-red-800">
                    This can&apos;t be undone. Files and medical history linked to it stay on{' '}
                    {appointment.patientName}&apos;s record.
                    {laterInCourse > 0 &&
                      ` It is appointment ${appointment.treatment!.stepNumber} of ${appointment.treatment!.stepCount} of ${appointment.treatment!.name}.`}
                  </p>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Keep it
                    </button>
                    {laterInCourse > 0 && (
                      <button
                        type="button"
                        onClick={() => void handleDelete('following')}
                        disabled={isDeleting}
                        className="rounded-lg border border-red-300 bg-white px-4 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        Delete this and the later ones
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => void handleDelete('this')}
                      disabled={isDeleting}
                      className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                    >
                      {isDeleting
                        ? 'Deleting…'
                        : laterInCourse > 0
                          ? 'Delete only this one'
                          : 'Delete appointment'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-5">
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="mr-auto rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-700"
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg border border-slate-300 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => void beginEditing()}
                    className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
                  >
                    Edit appointment
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-medium text-slate-900">{value}</dd>
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
    <label className="block space-y-1.5 text-left">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  )
}

function requiredValue(form: FormData, name: string) {
  const value = String(form.get(name) ?? '').trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

function formatLabel(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

function localDateAndTime(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')

  return { date: `${year}-${month}-${day}`, time: `${hours}:${minutes}` }
}

function formatDateAndTime(dateKey: string, time?: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const formattedDate = new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)

  return time ? `${formattedDate} at ${time}` : formattedDate
}

function formatDuration(durationMinutes: number) {
  if (durationMinutes < 60) return `${durationMinutes} minutes`
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  return minutes > 0
    ? `${hours} hr ${minutes} min`
    : `${hours} ${hours === 1 ? 'hour' : 'hours'}`
}

const inputStyles =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100'
