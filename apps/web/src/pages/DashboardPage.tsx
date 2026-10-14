import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAppointments } from '../api/schedule'
import AppointmentDetailsModal from '../components/AppointmentDetailsModal'
import CalendarEventList from '../components/CalendarEventList'
import DataPanel from '../components/DataPanel'
import TwoWeekCalendar from '../components/TwoWeekCalendar'
import {
  addDays,
  appointmentToCalendarEvent,
  getEventsBetween,
  toDateKey,
} from '../data/calendarEvents'
import type { CalendarEvent } from '../data/calendarEvents'
import type { Appointment } from '../types/schedule'

export default function DashboardPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const today = new Date()
  const todayKey = toDateKey(today)
  const displayEvents = appointments.map(appointmentToCalendarEvent)
  const nextTwoWeeks = getEventsBetween(
    today,
    addDays(today, 13),
    displayEvents,
  )
  const todayEvents = nextTwoWeeks.filter((event) => event.date === todayKey)
  const treatmentEvents = nextTwoWeeks.filter(
    (event) => event.category === 'TREATMENT',
  )
  const upcomingTasks = nextTwoWeeks.filter(
    (event) => event.date > todayKey,
  )
  const needsAttention = todayEvents.filter(
    (event) => event.status === 'SCHEDULED',
  )
  const selectedAppointment = selectedEvent
    ? appointments.find((appointment) => appointment.id === selectedEvent.id)
    : undefined

  useEffect(() => {
    const rangeStart = new Date()
    rangeStart.setHours(0, 0, 0, 0)
    const rangeEnd = addDays(rangeStart, 13)
    rangeEnd.setHours(23, 59, 59, 999)
    let isActive = true

    getAppointments({ from: rangeStart, to: rangeEnd })
      .then((appointmentData) => {
        if (isActive) setAppointments(appointmentData)
      })
      .catch(() => {
        // Keep the dashboard rendered while the API starts.
      })

    return () => {
      isActive = false
    }
  }, [])

  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between gap-4">
        <div>
          <p className="font-semibold text-teal-600">Clinic overview</p>
          <h1 className="text-3xl font-bold">
            Carmen&apos;s Clinic dashboard
          </h1>
          <p className="mt-1 text-slate-500">
            Patients, owners and upcoming clinical work.
          </p>
        </div>

        <Link
          to="/agenda"
          className="rounded-lg bg-teal-600 px-4 py-2 font-semibold text-white transition hover:bg-teal-700"
        >
          Open agenda
        </Link>
      </section>

      <TwoWeekCalendar
        events={displayEvents}
        onEventSelect={setSelectedEvent}
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <DataPanel title="Today's appointments">
          <CalendarEventList
            events={todayEvents}
            emptyMessage="No appointments or checks scheduled for today."
            showDate={false}
            onEventSelect={setSelectedEvent}
          />
        </DataPanel>

        <DataPanel title="Patients under treatment">
          <CalendarEventList
            events={treatmentEvents}
            emptyMessage="No treatment checks in the next 14 days."
            onEventSelect={setSelectedEvent}
          />
        </DataPanel>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <DataPanel title="Important upcoming tasks">
          <CalendarEventList
            events={upcomingTasks}
            emptyMessage="No upcoming tasks in the next 14 days."
            onEventSelect={setSelectedEvent}
          />
        </DataPanel>

        <DataPanel title="Needs attention">
          <CalendarEventList
            events={needsAttention}
            emptyMessage="No patients currently require attention."
            showDate={false}
            onEventSelect={setSelectedEvent}
          />
        </DataPanel>
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
