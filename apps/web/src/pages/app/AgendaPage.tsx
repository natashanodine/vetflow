import { useEffect, useMemo, useRef, useState } from 'react'
import { getAppointments, getClosedDays, getScheduleRules } from '../../api/schedule'
import AppointmentForm from '../../components/AppointmentForm'
import AppointmentDetailsModal from '../../components/AppointmentDetailsModal'
import CalendarEventList from '../../components/CalendarEventList'
import ClosedDatesPanel from '../../components/ClosedDatesPanel'
import DayWarningDialog from '../../components/DayWarningDialog'
import MonthCalendar from '../../components/MonthCalendar'
import WorkingHoursPanel from '../../components/WorkingHoursPanel'
import { dayWarnings, hasDayWarning, openWeekdaysOf } from '../../lib/clinicCalendar'
import {
  addDays,
  appointmentToCalendarEvent,
  getEventsBetween,
} from '../../data/calendarEvents'
import type { CalendarEvent } from '../../data/calendarEvents'
import type { Appointment, ClosedDay, ScheduleRules } from '../../types/schedule'

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isAddingAppointment, setIsAddingAppointment] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [uploadWarning, setUploadWarning] = useState<string | null>(null)
  const [closedDays, setClosedDays] = useState<ClosedDay[]>([])
  /** A past, weekend or closed day the person clicked; asks before booking. */
  const [pendingDate, setPendingDate] = useState<string | null>(null)
  /** A day the person already confirmed booking on despite the warning. */
  const [confirmedDate, setConfirmedDate] = useState<string>()
  const [rules, setRules] = useState<ScheduleRules | null>(null)
  const openWeekdays = useMemo(() => openWeekdaysOf(rules), [rules])
  const closedDayMap = useMemo(
    () => new Map(closedDays.map((day) => [day.date, day.reason])),
    [closedDays],
  )

  function openFormOn(dateKey: string, confirmed: boolean) {
    setSelectedDate(dateKey)
    setConfirmedDate(confirmed ? dateKey : undefined)
    setIsAddingAppointment(true)
  }
  const formContainerRef = useRef<HTMLDivElement>(null)
  const today = new Date()
  const displayEvents = appointments.map(appointmentToCalendarEvent)
  const nextFourWeeks = getEventsBetween(
    today,
    addDays(today, 28),
    displayEvents,
  )
  const selectedAppointment = selectedEvent
    ? appointments.find((appointment) => appointment.id === selectedEvent.id)
    : undefined

  useEffect(() => {
    let isActive = true

    getAppointments()
      .then((appointmentData) => {
        if (isActive) setAppointments(appointmentData)
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setLoadError(
          error instanceof Error
            ? error.message
            : 'Unable to load saved appointments',
        )
      })

    getClosedDays()
      .then((data) => {
        if (isActive) setClosedDays(data)
      })
      .catch(() => undefined)

    getScheduleRules()
      .then((data) => {
        if (isActive) setRules(data)
      })
      .catch(() => undefined)

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (isAddingAppointment) {
      formContainerRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }
  }, [isAddingAppointment, selectedDate])

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-600">Clinic schedule</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">Agenda</h1>
          <p className="mt-2 text-slate-500">
            Appointments, treatment checks and reproductive procedures.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedDate(undefined)
            setIsAddingAppointment((current) => !current)
          }}
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white hover:bg-teal-700"
        >
          {isAddingAppointment ? 'Close form' : 'New appointment'}
        </button>
      </section>

      {uploadWarning && (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <p>{uploadWarning}</p>
          <button
            type="button"
            onClick={() => setUploadWarning(null)}
            aria-label="Dismiss"
            className="font-semibold text-amber-900 hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Saved appointments could not be loaded: {loadError}.
        </div>
      )}

      {isAddingAppointment && (
        <div ref={formContainerRef}>
          <AppointmentForm
            key={selectedDate ?? 'manual-appointment'}
            initialDate={selectedDate}
            closedDays={closedDayMap}
            rules={rules}
            {...(confirmedDate && { confirmedDate })}
            onCancel={() => setIsAddingAppointment(false)}
            onCreated={(created, warning) => {
              setUploadWarning(warning ?? null)
              setAppointments((current) => [...current, ...created])
              setIsAddingAppointment(false)
              setSelectedDate(undefined)
            }}
          />
        </div>
      )}

      <MonthCalendar
        events={displayEvents}
        onEventSelect={setSelectedEvent}
        closedDays={closedDayMap}
        openWeekdays={openWeekdays}
        onDateSelect={(dateKey) => {
          if (hasDayWarning(dayWarnings(dateKey, closedDayMap, openWeekdays))) {
            setPendingDate(dateKey)
          } else {
            openFormOn(dateKey, false)
          }
        }}
      />

      {pendingDate && (
        <DayWarningDialog
          dateKey={pendingDate}
          warnings={dayWarnings(pendingDate, closedDayMap, openWeekdays)}
          onCancel={() => setPendingDate(null)}
          onContinue={() => {
            openFormOn(pendingDate, true)
            setPendingDate(null)
          }}
        />
      )}

      <WorkingHoursPanel rules={rules} onChange={setRules} />

      <ClosedDatesPanel closedDays={closedDays} onChange={setClosedDays} />

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">
          Upcoming four weeks
        </h2>
        <div className="mt-4">
          <CalendarEventList
            events={nextFourWeeks}
            onEventSelect={setSelectedEvent}
          />
        </div>
      </section>

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
          onUpdated={(updatedAppointment) => {
            setAppointments((current) =>
              current.map((appointment) =>
                appointment.id === updatedAppointment.id
                  ? updatedAppointment
                  : appointment,
              ),
            )
            setSelectedEvent(appointmentToCalendarEvent(updatedAppointment))
          }}
        />
      )}
    </div>
  )
}

