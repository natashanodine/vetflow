export type CalendarEventCategory =
  | 'APPOINTMENT'
  | 'TREATMENT'
  | 'REPRODUCTION'

export type CalendarEventStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export interface CalendarEvent {
  id: string
  patientName: string
  title: string
  details: string
  date: string
  time?: string
  durationMinutes: number
  category: CalendarEventCategory
  status: CalendarEventStatus
}

interface AppointmentCalendarSource {
  id: string
  patientName: string
  title: string
  details: string | null
  startsAt: string
  durationMinutes: number
  category: CalendarEventCategory
  status: CalendarEventStatus
}

export function addDays(date: Date, numberOfDays: number) {
  const result = new Date(date)
  result.setDate(result.getDate() + numberOfDays)
  return result
}

export function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function fromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getEventsBetween(
  start: Date,
  end: Date,
  events: CalendarEvent[] = [],
) {
  const startKey = toDateKey(start)
  const endKey = toDateKey(end)

  return events
    .filter((event) => event.date >= startKey && event.date <= endKey)
    .sort((left, right) => {
      const leftValue = `${left.date} ${left.time ?? '00:00'}`
      const rightValue = `${right.date} ${right.time ?? '00:00'}`
      return leftValue.localeCompare(rightValue)
    })
}

export function appointmentToCalendarEvent(
  appointment: AppointmentCalendarSource,
): CalendarEvent {
  const startsAt = new Date(appointment.startsAt)

  return {
    id: appointment.id,
    patientName: appointment.patientName,
    title: appointment.title,
    details: appointment.details ?? 'No additional details.',
    date: toDateKey(startsAt),
    time: new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(startsAt),
    durationMinutes: appointment.durationMinutes,
    category: appointment.category,
    status: appointment.status,
  }
}

