import type { CalendarEvent } from '../data/calendarEvents'
import { fromDateKey } from '../data/calendarEvents'

interface CalendarEventListProps {
  events: CalendarEvent[]
  emptyMessage?: string
  showDate?: boolean
  onEventSelect?: (event: CalendarEvent) => void
}

const categoryStyles = {
  APPOINTMENT: 'bg-sky-100 text-sky-800',
  TREATMENT: 'bg-rose-100 text-rose-800',
  REPRODUCTION: 'bg-violet-100 text-violet-800',
}

export default function CalendarEventList({
  events,
  emptyMessage = 'Nothing scheduled for this period.',
  showDate = true,
  onEventSelect,
}: CalendarEventListProps) {
  if (events.length === 0) {
    return <p className="py-6 text-sm text-slate-500">{emptyMessage}</p>
  }

  return (
    <div className="divide-y divide-slate-100">
      {events.map((event) => (
        <article key={event.id} className="py-4 first:pt-0 last:pb-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-slate-900">
                {event.patientName}
              </p>
              <p className="text-sm font-medium text-slate-700">
                {event.title}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyles[event.category]}`}
            >
              {formatCategory(event.category)}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">{event.details}</p>

          {showDate && (
            <p className="mt-2 text-sm font-semibold text-teal-700">
              {formatEventDate(event.date)}
              {event.time ? ` at ${event.time}` : ''}
            </p>
          )}

          {onEventSelect && (
            <button
              type="button"
              onClick={() => onEventSelect(event)}
              className="mt-3 text-sm font-semibold text-teal-700 hover:text-teal-900 hover:underline"
            >
              View details
            </button>
          )}
        </article>
      ))}
    </div>
  )
}

function formatCategory(category: CalendarEvent['category']) {
  return category.charAt(0) + category.slice(1).toLowerCase()
}

function formatEventDate(dateKey: string) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(fromDateKey(dateKey))
}

