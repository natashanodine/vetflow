import { useMemo } from 'react'
import type { CalendarEvent } from '../data/calendarEvents'
import { addDays, toDateKey } from '../data/calendarEvents'

interface TwoWeekCalendarProps {
  events: CalendarEvent[]
  onEventSelect?: (event: CalendarEvent) => void
}

const categoryDotStyles = {
  APPOINTMENT: 'bg-sky-500',
  TREATMENT: 'bg-rose-500',
  REPRODUCTION: 'bg-violet-500',
}

export default function TwoWeekCalendar({
  events,
  onEventSelect,
}: TwoWeekCalendarProps) {
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, index) => addDays(today, index)),
    [today],
  )

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((result, event) => {
      result[event.date] ??= []
      result[event.date].push(event)
      return result
    }, {})
  }, [events])

  const rangeLabel = `${formatRangeDate(days[0])} – ${formatRangeDate(days[13])}`

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Next two weeks</h2>
          <p className="mt-1 text-sm text-slate-500">{rangeLabel}</p>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-slate-500">
          <Legend color="bg-sky-500" label="Appointment" />
          <Legend color="bg-rose-500" label="Treatment" />
          <Legend color="bg-violet-500" label="Reproduction" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-7">
          {days.map((date, index) => {
            const dateKey = toDateKey(date)
            const dayEvents = eventsByDate[dateKey] ?? []

            return (
              <div
                key={dateKey}
                className={`min-h-36 border-b border-r border-slate-100 p-2 ${
                  index === 0 ? 'bg-teal-50/60' : 'bg-white'
                }`}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase text-slate-400">
                      {new Intl.DateTimeFormat(undefined, {
                        weekday: 'short',
                      }).format(date)}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        index === 0 ? 'text-teal-700' : 'text-slate-700'
                      }`}
                    >
                      {new Intl.DateTimeFormat(undefined, {
                        month: 'short',
                        day: 'numeric',
                      }).format(date)}
                    </p>
                  </div>

                  {index === 0 && (
                    <span className="rounded-full bg-teal-600 px-2 py-0.5 text-[10px] font-semibold uppercase text-white">
                      Today
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-slate-300">No events</p>
                  ) : (
                    dayEvents.slice(0, 2).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        title={`${event.patientName}: ${event.title}`}
                        onClick={() => onEventSelect?.(event)}
                        className="flex w-full items-start gap-1.5 rounded-md bg-slate-50 px-2 py-1.5 text-left text-xs text-slate-700 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      >
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${categoryDotStyles[event.category]}`}
                        />
                        <span className="line-clamp-2">
                          <strong>{event.patientName}</strong> · {event.title}
                        </span>
                      </button>
                    ))
                  )}

                  {dayEvents.length > 2 && (
                    <p className="px-2 text-xs font-medium text-slate-500">
                      +{dayEvents.length - 2} more
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function formatRangeDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

