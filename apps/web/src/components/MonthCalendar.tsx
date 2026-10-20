import { useMemo, useState } from 'react'
import type { CalendarEvent } from '../data/calendarEvents'
import { addDays, toDateKey } from '../data/calendarEvents'
import {
  DEFAULT_OPEN_WEEKDAYS,
  isRegularlyClosed,
  type ClosedDayMap,
  type OpenWeekdays,
} from '../lib/clinicCalendar'

interface MonthCalendarProps {
  events: CalendarEvent[]
  /**
   * Called for any day clicked, including past, weekend and closed days
   * (which look unavailable; the page asks before booking on them).
   */
  onDateSelect?: (dateKey: string) => void
  onEventSelect?: (event: CalendarEvent) => void
  /** Holidays and other closed dates, with their reason. */
  closedDays?: ClosedDayMap
  /** Days of the week the clinic opens; the others look unavailable. */
  openWeekdays?: OpenWeekdays
}

const noClosedDays: ClosedDayMap = new Map()

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const categoryDotStyles = {
  APPOINTMENT: 'bg-sky-500',
  TREATMENT: 'bg-rose-500',
  REPRODUCTION: 'bg-violet-500',
}

export default function MonthCalendar({
  events,
  onDateSelect,
  onEventSelect,
  closedDays = noClosedDays,
  openWeekdays = DEFAULT_OPEN_WEEKDAYS,
}: MonthCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [visibleMonth, setVisibleMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  )

  const calendarDays = useMemo(() => {
    const monthStart = new Date(
      visibleMonth.getFullYear(),
      visibleMonth.getMonth(),
      1,
    )
    const gridStart = addDays(monthStart, -monthStart.getDay())

    return Array.from({ length: 42 }, (_, index) =>
      addDays(gridStart, index),
    )
  }, [visibleMonth])

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, CalendarEvent[]>>((result, event) => {
      result[event.date] ??= []
      result[event.date].push(event)
      return result
    }, {})
  }, [events])

  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(visibleMonth)

  function changeMonth(offset: number) {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    )
  }

  function showToday() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{monthLabel}</h2>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500">
            <Legend color="bg-sky-500" label="Appointment" />
            <Legend color="bg-rose-500" label="Treatment" />
            <Legend color="bg-violet-500" label="Reproduction" />
          </div>
          {onDateSelect && (
            <p className="mt-2 text-xs font-medium text-teal-700">
              Select a day to add an appointment. Grey days are in the past or the
              clinic is closed; you&apos;ll be asked before booking on them.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
            className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={showToday}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => changeMonth(1)}
            aria-label="Next month"
            className="rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-600 hover:bg-slate-50"
          >
            ›
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[760px]">
          <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
            {weekDays.map((day) => (
              <div
                key={day}
                className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((date) => {
              const dateKey = toDateKey(date)
              const dayEvents = eventsByDate[dateKey] ?? []
              const isCurrentMonth =
                date.getMonth() === visibleMonth.getMonth()
              const isToday = dateKey === toDateKey(today)
              const isPast = dateKey < toDateKey(today)
              const closedReason = closedDays.has(dateKey)
                ? (closedDays.get(dateKey) ?? '')
                : null
              const isClosed = isRegularlyClosed(date, openWeekdays) || closedReason !== null
              // Unavailable days stay clickable but look unavailable.
              const isBlocked = isPast || isClosed
              const canSelect = Boolean(onDateSelect)

              return (
                <div
                  key={dateKey}
                  role={canSelect ? 'button' : undefined}
                  tabIndex={canSelect ? 0 : undefined}
                  data-past={isPast || undefined}
                  data-closed={isClosed || undefined}
                  data-holiday={closedReason !== null || undefined}
                  aria-label={
                    canSelect
                      ? `Add appointment on ${new Intl.DateTimeFormat(
                          undefined,
                          {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          },
                        ).format(date)}`
                      : undefined
                  }
                  onClick={() => {
                    if (canSelect) onDateSelect?.(dateKey)
                  }}
                  onKeyDown={(event) => {
                    if (
                      canSelect &&
                      onDateSelect &&
                      (event.key === 'Enter' || event.key === ' ')
                    ) {
                      event.preventDefault()
                      onDateSelect(dateKey)
                    }
                  }}
                  title={
                    closedReason
                      ? `Closed: ${closedReason}`
                      : closedReason === ''
                        ? 'Closed'
                        : onDateSelect && isPast
                          ? 'In the past'
                          : onDateSelect && isClosed
                            ? 'Weekend'
                            : undefined
                  }
                  className={`min-h-32 border-b border-r border-slate-100 p-2 text-left outline-none ${
                    isBlocked && onDateSelect
                      ? 'bg-slate-100/80'
                      : isCurrentMonth
                        ? 'bg-white'
                        : 'bg-slate-50/70'
                  } ${
                    canSelect
                      ? `cursor-pointer focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 ${
                          isBlocked ? 'hover:bg-slate-200/60' : 'hover:bg-teal-50'
                        }`
                      : ''
                  }`}
                >
                  <div
                    className={`mb-2 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${
                      isToday
                        ? 'bg-teal-600 text-white'
                        : isBlocked && onDateSelect
                          ? 'text-slate-300'
                          : isCurrentMonth
                          ? 'text-slate-700'
                          : 'text-slate-400'
                    }`}
                  >
                    {date.getDate()}
                  </div>
                  {closedReason !== null && (
                    <p className="-mt-1 mb-1 truncate text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      Closed{closedReason ? ` · ${closedReason}` : ''}
                    </p>
                  )}

                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        title={`${event.patientName}: ${event.title}`}
                        onClick={(clickEvent) => {
                          clickEvent.stopPropagation()
                          onEventSelect?.(event)
                        }}
                        onKeyDown={(keyboardEvent) =>
                          keyboardEvent.stopPropagation()
                        }
                        className="flex w-full items-start gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-left text-xs text-slate-700 hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
                      >
                        <span
                          className={`mt-1 h-2 w-2 shrink-0 rounded-full ${categoryDotStyles[event.category]}`}
                        />
                        <span className="line-clamp-2">
                          <strong>{event.patientName}</strong> · {event.title}
                        </span>
                      </button>
                    ))}

                    {dayEvents.length > 3 && (
                      <p className="px-2 text-xs font-medium text-slate-500">
                        +{dayEvents.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
      {label}
    </span>
  )
}

