import { useEffect, useRef, useState } from 'react'
import { getAppointments } from '../api/schedule'
import AppointmentForm from '../components/AppointmentForm'
import AppointmentDetailsModal from '../components/AppointmentDetailsModal'
import CalendarEventList from '../components/CalendarEventList'
import MonthCalendar from '../components/MonthCalendar'
import {
  addDays,
  appointmentToCalendarEvent,
  getEventsBetween,
} from '../data/calendarEvents'
import type { CalendarEvent } from '../data/calendarEvents'
import type { Appointment } from '../types/schedule'

export default function AgendaPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [isAddingAppointment, setIsAddingAppointment] = useState(false)
  const [selectedDate, setSelectedDate] = useState<string>()
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
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
            onCancel={() => setIsAddingAppointment(false)}
            onCreated={(appointment) => {
              setAppointments((current) => [...current, appointment])
              setIsAddingAppointment(false)
              setSelectedDate(undefined)
            }}
          />
        </div>
      )}

      <MonthCalendar
        events={displayEvents}
        onEventSelect={setSelectedEvent}
        onDateSelect={(dateKey) => {
          setSelectedDate(dateKey)
          setIsAddingAppointment(true)
        }}
      />

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

