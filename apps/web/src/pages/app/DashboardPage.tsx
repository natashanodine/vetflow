import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getActiveMedications } from '../../api/clinic'
import { getAppointments, getClosedDays, getScheduleRules } from '../../api/schedule'
import AppointmentDetailsModal from '../../components/AppointmentDetailsModal'
import AppointmentForm from '../../components/AppointmentForm'
import {
  addDays,
  appointmentToCalendarEvent,
  fromDateKey,
  toDateKey,
} from '../../data/calendarEvents'
import type { CalendarEvent } from '../../data/calendarEvents'
import { dayWarnings, hoursOnDate, openWeekdaysOf } from '../../lib/clinicCalendar'
import { describeMedication } from '../../lib/medications'
import type { ActiveMedication } from '../../types/clinic'
import type { Appointment, ClosedDay, ScheduleRules } from '../../types/schedule'

const categoryStyles = {
  APPOINTMENT: { bar: 'bg-sky-500', label: 'Appointment' },
  TREATMENT: { bar: 'bg-rose-500', label: 'Treatment' },
  REPRODUCTION: { bar: 'bg-violet-500', label: 'Reproduction' },
}

const statusStyles = {
  SCHEDULED: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-slate-200 text-slate-600',
}

const statusLabels = { SCHEDULED: 'To do', COMPLETED: 'Done', CANCELLED: 'Cancelled' }

/** One day at the clinic: its appointments, plus who is on medication. */
export default function DashboardPage({ clinicName }: { clinicName: string }) {
  const [dayKey, setDayKey] = useState(() => toDateKey(new Date()))
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [medications, setMedications] = useState<ActiveMedication[] | null>(null)
  const [rules, setRules] = useState<ScheduleRules | null>(null)
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([])
  const formRef = useRef<HTMLDivElement>(null)

  const todayKey = toDateKey(new Date())
  const isToday = dayKey === todayKey
  const closedDayMap = useMemo(
    () => new Map(closedDays.map((day) => [day.date, day.reason])),
    [closedDays],
  )
  const openWeekdays = useMemo(() => openWeekdaysOf(rules), [rules])
  const warnings = dayWarnings(dayKey, closedDayMap, openWeekdays)
  const hours = hoursOnDate(rules, dayKey)

  const dayAppointments = appointments
    .filter((appointment) => toDateKey(new Date(appointment.startsAt)) === dayKey)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  const doneCount = dayAppointments.filter(
    (appointment) => appointment.status === 'COMPLETED',
  ).length
  const toDoCount = dayAppointments.filter(
    (appointment) => appointment.status === 'SCHEDULED',
  ).length
  const comingUp = appointments
    .filter(
      (appointment) =>
        appointment.status === 'SCHEDULED' && toDateKey(new Date(appointment.startsAt)) > dayKey,
    )
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 6)

  const selectedAppointment = appointments.find((appointment) => appointment.id === selectedId)

  // The chosen day and the week after it (for "Coming up").
  useEffect(() => {
    let isActive = true
    const from = fromDateKey(dayKey)
    const to = addDays(from, 8)
    getAppointments({ from, to })
      .then((data) => {
        if (!isActive) return
        setAppointments(data)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (isActive)
          setLoadError(error instanceof Error ? error.message : 'Unable to load appointments')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
      })
    return () => {
      isActive = false
    }
  }, [dayKey])

  useEffect(() => {
    let isActive = true
    getActiveMedications()
      .then((data) => {
        if (isActive) setMedications(data)
      })
      .catch(() => {
        if (isActive) setMedications([])
      })
    getScheduleRules()
      .then((data) => {
        if (isActive) setRules(data)
      })
      .catch(() => undefined)
    getClosedDays()
      .then((data) => {
        if (isActive) setClosedDays(data)
      })
      .catch(() => undefined)
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (isAdding) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isAdding])

  function goTo(nextDayKey: string) {
    setDayKey(nextDayKey)
    setIsAdding(false)
    setNotice(null)
  }

  function refreshMedications() {
    getActiveMedications()
      .then(setMedications)
      .catch(() => undefined)
  }

  // Patients on medication, each with their current medications.
  const medicatedPatients = useMemo(() => {
    const byPatient = new Map<
      string,
      { patientId: string; patientName: string; items: ActiveMedication[] }
    >()
    for (const medication of medications ?? []) {
      const entry = byPatient.get(medication.patientId) ?? {
        patientId: medication.patientId,
        patientName: medication.patientName,
        items: [],
      }
      entry.items.push(medication)
      byPatient.set(medication.patientId, entry)
    }
    return [...byPatient.values()].sort((a, b) => a.patientName.localeCompare(b.patientName))
  }, [medications])

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-600">Clinic overview</p>
          <h1 className="text-3xl font-bold">{clinicName} dashboard</h1>
        </div>
        <Link
          to="/app/agenda"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Open agenda
        </Link>
      </section>

      {notice && (
        <p
          role="status"
          className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900"
        >
          {notice}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section
          aria-labelledby="day-title"
          className="rounded-2xl border border-slate-200 bg-white shadow-sm lg:col-span-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-6">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goTo(toDateKey(addDays(fromDateKey(dayKey), -1)))}
                aria-label="Previous day"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-lg leading-none text-slate-600 hover:bg-slate-50"
              >
                ‹
              </button>
              <div className="min-w-0 px-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">
                  {isToday ? 'Today' : relativeDay(dayKey, todayKey)}
                </p>
                <h2 id="day-title" className="text-xl font-bold text-slate-900">
                  {formatLongDate(dayKey)}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => goTo(toDateKey(addDays(fromDateKey(dayKey), 1)))}
                aria-label="Next day"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-lg leading-none text-slate-600 hover:bg-slate-50"
              >
                ›
              </button>
              {!isToday && (
                <button
                  type="button"
                  onClick={() => goTo(todayKey)}
                  className="ml-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Today
                </button>
              )}
              <input
                type="date"
                aria-label="Go to date"
                value={dayKey}
                onChange={(event) => event.target.value && goTo(event.target.value)}
                className="ml-1 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-600"
              />
            </div>
            <button
              type="button"
              onClick={() => setIsAdding((current) => !current)}
              className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
            >
              {isAdding ? 'Close form' : 'New appointment'}
            </button>
          </div>

          <div className="space-y-4 p-6">
            <p className="text-sm text-slate-500">
              {warnings.closedReason !== null
                ? `Clinic closed${warnings.closedReason ? ` (${warnings.closedReason})` : ''}`
                : hours && !hours.open
                  ? 'The clinic is normally closed on this day'
                  : hours
                    ? `Open ${hours.opensAt}–${hours.closesAt}`
                    : ''}
              {dayAppointments.length > 0 &&
                `${hours ? ' · ' : ''}${dayAppointments.length} ${dayAppointments.length === 1 ? 'appointment' : 'appointments'}: ${doneCount} done, ${toDoCount} to do`}
            </p>

            {isAdding && (
              <div ref={formRef}>
                <AppointmentForm
                  key={dayKey}
                  initialDate={dayKey}
                  closedDays={closedDayMap}
                  rules={rules}
                  onCancel={() => setIsAdding(false)}
                  onCreated={(created, warning) => {
                    setAppointments((current) => [...current, ...created])
                    setIsAdding(false)
                    setNotice(warning ?? null)
                  }}
                />
              </div>
            )}

            {loadError && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                Appointments could not be loaded: {loadError}.
              </p>
            )}

            {isLoading ? (
              <p className="text-sm text-slate-500">Loading appointments…</p>
            ) : dayAppointments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-500">
                No appointments on this day.
              </div>
            ) : (
              <ol className="space-y-2">
                {dayAppointments.map((appointment) => (
                  <li key={appointment.id}>
                    <DayAppointment
                      appointment={appointment}
                      onSelect={() => setSelectedId(appointment.id)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>

        <div className="space-y-6">
          <section
            aria-labelledby="medication-title"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 id="medication-title" className="text-lg font-bold text-slate-900">
              On medication
            </h2>
            {medications === null ? (
              <p className="mt-3 text-sm text-slate-500">Loading…</p>
            ) : medicatedPatients.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No patients are on medication.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {medicatedPatients.map((patient) => (
                  <li key={patient.patientId} className="py-3">
                    <Link
                      to={`/app/patients/${patient.patientId}`}
                      className="font-semibold text-teal-700 hover:underline"
                    >
                      {patient.patientName}
                    </Link>
                    <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                      {patient.items.map((medication) => (
                        <li key={medication.id}>
                          <span className="font-medium text-slate-800">{medication.name}</span>
                          {describeMedication(medication)}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            aria-labelledby="coming-up-title"
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 id="coming-up-title" className="text-lg font-bold text-slate-900">
              Coming up
            </h2>
            {comingUp.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing booked in the following week.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100">
                {comingUp.map((appointment) => (
                  <li key={appointment.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(appointment.id)}
                      className="w-full py-2 text-left hover:bg-slate-50"
                    >
                      <span className="block text-xs font-semibold text-slate-500">
                        {formatShortDay(appointment.startsAt)} · {formatTime(appointment.startsAt)}
                      </span>
                      <span className="block text-sm text-slate-800">
                        <span className="font-semibold">{appointment.patientName}</span> ·{' '}
                        {appointment.title}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {selectedAppointment && (
        <AppointmentDetailsModal
          key={selectedAppointment.id}
          event={appointmentToCalendarEvent(selectedAppointment) satisfies CalendarEvent}
          appointment={selectedAppointment}
          onClose={() => setSelectedId(null)}
          onDeleted={(deletedIds) => {
            setAppointments((current) =>
              current.filter((appointment) => !deletedIds.includes(appointment.id)),
            )
            setSelectedId(null)
          }}
          onBooked={(booked) => setAppointments((current) => [...current, ...booked])}
          onUpdated={(updated) => {
            setAppointments((current) =>
              current.map((appointment) => (appointment.id === updated.id ? updated : appointment)),
            )
            // Medications may have been started at the visit.
            if (updated.status === 'COMPLETED') refreshMedications()
          }}
        />
      )}
    </div>
  )
}

function DayAppointment({
  appointment,
  onSelect,
}: {
  appointment: Appointment
  onSelect: () => void
}) {
  const isDone = appointment.status !== 'SCHEDULED'
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-stretch gap-4 rounded-xl border border-slate-200 p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/40 ${isDone ? 'opacity-70' : ''}`}
    >
      <span className="w-14 shrink-0 text-right">
        <span className="block font-bold text-slate-900">{formatTime(appointment.startsAt)}</span>
        <span className="block text-xs text-slate-500">{appointment.durationMinutes} min</span>
      </span>
      <span className={`w-1 shrink-0 rounded-full ${categoryStyles[appointment.category].bar}`} />
      <span className="min-w-0 flex-1">
        <span
          className={`block font-semibold text-slate-900 ${appointment.status === 'CANCELLED' ? 'line-through' : ''}`}
        >
          {appointment.patientName}
        </span>
        <span className="block truncate text-sm text-slate-600">
          {appointment.title}
          {appointment.treatment &&
            ` · ${appointment.treatment.name} ${appointment.treatment.stepNumber}/${appointment.treatment.stepCount}`}
        </span>
      </span>
      <span className="self-center">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[appointment.status]}`}
        >
          {statusLabels[appointment.status]}
        </span>
      </span>
    </button>
  )
}

function formatLongDate(dayKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(fromDateKey(dayKey))
}

function relativeDay(dayKey: string, todayKey: string) {
  const days = Math.round(
    (fromDateKey(dayKey).getTime() - fromDateKey(todayKey).getTime()) / 86_400_000,
  )
  if (days === 1) return 'Tomorrow'
  if (days === -1) return 'Yesterday'
  return days > 0 ? `In ${days} days` : `${-days} days ago`
}

function formatShortDay(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso))
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}
