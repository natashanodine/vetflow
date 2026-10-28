import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAppointments, getClosedDays, getScheduleRules } from '../../api/schedule'
import AppointmentDetailsModal from '../../components/AppointmentDetailsModal'
import AppointmentForm from '../../components/AppointmentForm'
import CalendarEventList from '../../components/CalendarEventList'
import {
  addDays,
  appointmentToCalendarEvent,
  fromDateKey,
  toDateKey,
} from '../../data/calendarEvents'
import type { CalendarEvent } from '../../data/calendarEvents'
import { patientsInTreatment, stepName } from '../../lib/underCare'
import { dayWarnings, hoursOnDate, openWeekdaysOf } from '../../lib/clinicCalendar'
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

/** How far back "Needs attention" looks, and ahead for upcoming work. */
const LOOK_BACK_DAYS = 14
const LOOK_AHEAD_DAYS = 14
/** Treatment courses can run for weeks; look further ahead for their next appointment. */
const COURSE_AHEAD_DAYS = 120

/** One day at the clinic, plus treatments, upcoming work and visits still open. */
export default function DashboardPage({ clinicName }: { clinicName: string }) {
  const [dayKey, setDayKey] = useState(() => toDateKey(new Date()))
  /** Appointments for the chosen day and the overview, by id. */
  const [appointmentsById, setAppointmentsById] = useState<ReadonlyMap<string, Appointment>>(
    new Map(),
  )
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [rules, setRules] = useState<ScheduleRules | null>(null)
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([])
  const [now] = useState(() => Date.now())
  const formRef = useRef<HTMLDivElement>(null)

  const appointments = useMemo(() => [...appointmentsById.values()], [appointmentsById])
  const todayKey = toDateKey(new Date(now))
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

  const lookAheadEnd = toDateKey(addDays(fromDateKey(todayKey), LOOK_AHEAD_DAYS))
  const lookBackStart = toDateKey(addDays(fromDateKey(todayKey), -LOOK_BACK_DAYS))
  const byTime = (a: Appointment, b: Appointment) => a.startsAt.localeCompare(b.startsAt)
  const upcoming = appointments
    .filter((appointment) => {
      const key = toDateKey(new Date(appointment.startsAt))
      return appointment.status === 'SCHEDULED' && key > todayKey && key <= lookAheadEnd
    })
    .sort(byTime)
  // Visits whose time has passed but nobody marked them done.
  const needsAttention = appointments
    .filter(
      (appointment) =>
        appointment.status === 'SCHEDULED' &&
        new Date(appointment.startsAt).getTime() + appointment.durationMinutes * 60_000 < now &&
        toDateKey(new Date(appointment.startsAt)) >= lookBackStart,
    )
    .sort(byTime)
  const inTreatment = patientsInTreatment(appointments, now, lookAheadEnd)

  const selectedAppointment = selectedId ? appointmentsById.get(selectedId) : undefined

  function merge(list: Appointment[]) {
    setAppointmentsById((current) => {
      const next = new Map(current)
      for (const appointment of list) next.set(appointment.id, appointment)
      return next
    })
  }

  // The overview: the last two weeks to a few months ahead (treatment courses).
  useEffect(() => {
    let isActive = true
    const today = fromDateKey(toDateKey(new Date()))
    getAppointments({
      from: addDays(today, -LOOK_BACK_DAYS),
      to: addDays(today, COURSE_AHEAD_DAYS),
    })
      .then((data) => {
        if (!isActive) return
        merge(data)
        setLoadError(null)
      })
      .catch((error: unknown) => {
        if (isActive)
          setLoadError(error instanceof Error ? error.message : 'Unable to load appointments')
      })
      .finally(() => {
        if (isActive) setIsLoading(false)
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

  // The chosen day, when it's outside the overview.
  useEffect(() => {
    let isActive = true
    const from = fromDateKey(dayKey)
    getAppointments({ from, to: addDays(from, 1) })
      .then((data) => {
        if (isActive) merge(data)
      })
      .catch(() => undefined)
    return () => {
      isActive = false
    }
  }, [dayKey])

  useEffect(() => {
    if (isAdding) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [isAdding])

  function goTo(nextDayKey: string) {
    setDayKey(nextDayKey)
    setIsAdding(false)
    setNotice(null)
  }

  const selectEvent = (event: CalendarEvent) => setSelectedId(event.id)

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
                    merge(created)
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

        <section
          aria-labelledby="treatment-title"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 id="treatment-title" className="text-lg font-bold text-slate-900">
            Patients under treatment
          </h2>
          {inTreatment.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">No treatments in progress.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {inTreatment.map((entry) => (
                <li key={entry.key} className="py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link
                      to={`/app/patients/${entry.patientId}`}
                      className="font-semibold text-teal-700 hover:underline"
                    >
                      {entry.patientName}
                    </Link>
                    {entry.stepCount > 1 && (
                      <span className="text-xs font-semibold text-slate-500">
                        {entry.done} of {entry.stepCount} done
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-700">{entry.name}</p>
                  {entry.stepCount > 1 && (
                    <div
                      className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100"
                      role="progressbar"
                      aria-label={`${entry.patientName}: ${entry.name}`}
                      aria-valuemin={0}
                      aria-valuemax={entry.stepCount}
                      aria-valuenow={entry.done}
                    >
                      <div
                        className="h-full rounded-full bg-rose-400"
                        style={{ width: `${(entry.done / entry.stepCount) * 100}%` }}
                      />
                    </div>
                  )}
                  {entry.next && (
                    <button
                      type="button"
                      onClick={() => setSelectedId(entry.next!.id)}
                      className="mt-1.5 text-xs font-semibold text-slate-500 hover:text-teal-700 hover:underline"
                    >
                      Next: {formatShortDay(entry.next.startsAt)} ·{' '}
                      {formatTime(entry.next.startsAt)}
                      {entry.next.treatment && ` · ${stepName(entry.next)}`}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="upcoming-title"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 id="upcoming-title" className="text-lg font-bold text-slate-900">
            Upcoming tasks
          </h2>
          <p className="text-sm text-slate-500">The next {LOOK_AHEAD_DAYS} days.</p>
          <div className="mt-4">
            <CalendarEventList
              events={upcoming.map(appointmentToCalendarEvent)}
              emptyMessage={`Nothing booked in the next ${LOOK_AHEAD_DAYS} days.`}
              onEventSelect={selectEvent}
            />
          </div>
        </section>

        <section
          aria-labelledby="attention-title"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <h2 id="attention-title" className="text-lg font-bold text-slate-900">
            Needs attention
          </h2>
          <p className="text-sm text-slate-500">
            Past appointments not marked as done. Open one to mark it done or cancel it.
          </p>
          <div className="mt-4">
            <CalendarEventList
              events={needsAttention.map(appointmentToCalendarEvent)}
              emptyMessage="All caught up."
              onEventSelect={selectEvent}
            />
          </div>
        </section>
      </div>

      {selectedAppointment && (
        <AppointmentDetailsModal
          key={selectedAppointment.id}
          event={appointmentToCalendarEvent(selectedAppointment) satisfies CalendarEvent}
          appointment={selectedAppointment}
          onClose={() => setSelectedId(null)}
          onDeleted={(deletedIds) => {
            setAppointmentsById((current) => {
              const next = new Map(current)
              for (const id of deletedIds) next.delete(id)
              return next
            })
            setSelectedId(null)
          }}
          onBooked={merge}
          onUpdated={(updated) => merge([updated])}
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
