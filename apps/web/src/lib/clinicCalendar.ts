import type { IntervalUnit, Treatment } from '../types/schedule'

/** Saturday or Sunday: the clinic is closed and no appointments can be booked. */
export function isWeekend(date: Date) {
  const day = date.getDay()
  return day === 0 || day === 6
}

/** isWeekend for a "YYYY-MM-DD" date key. */
export function isWeekendKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return isWeekend(new Date(year!, month! - 1, day))
}

export const CLOSED_DAY_MESSAGE =
  'The clinic is closed on Saturdays and Sundays. Choose a weekday.'

/** Closed dates by "YYYY-MM-DD", with their reason (or null). */
export type ClosedDayMap = ReadonlyMap<string, string | null>

export function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export interface DayWarnings {
  /** The whole day is before today. */
  isPastDay: boolean
  isWeekend: boolean
  /** Set when the date is marked closed; empty string if no reason was given. */
  closedReason: string | null
}

export function dayWarnings(dateKey: string, closedDays: ClosedDayMap): DayWarnings {
  return {
    isPastDay: dateKey < todayKey(),
    isWeekend: isWeekendKey(dateKey),
    closedReason: closedDays.has(dateKey) ? (closedDays.get(dateKey) ?? '') : null,
  }
}

export function hasDayWarning(warnings: DayWarnings) {
  return warnings.isPastDay || warnings.isWeekend || warnings.closedReason !== null
}

export function formatDayKey(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year!, month! - 1, day))
}

/** Plain-language warnings for booking on a day, one sentence each. */
export function describeDayWarnings(dateKey: string, warnings: DayWarnings) {
  const weekdayName = new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
    new Date(`${dateKey}T12:00:00`),
  )
  const sentences: string[] = []
  if (warnings.closedReason !== null) {
    sentences.push(
      warnings.closedReason
        ? `The clinic is closed on this date (${warnings.closedReason}).`
        : 'The clinic is marked closed on this date.',
    )
  }
  if (warnings.isWeekend) {
    sentences.push(`This is a ${weekdayName}, when the clinic is normally closed.`)
  }
  if (warnings.isPastDay) {
    sentences.push(
      'This date is in the past. Use it to record an appointment that wasn’t added at the time.',
    )
  }
  return sentences
}

function plural(value: number, unit: IntervalUnit) {
  const word = unit === 'WEEKS' ? 'week' : 'day'
  return `${value} ${value === 1 ? word : `${word}s`}`
}

/** e.g. "2 weeks after the previous one" */
export function describeGap(value: number, unit: IntervalUnit) {
  return `${plural(value, unit)} after the previous one`
}

/** e.g. "3 appointments over 5 weeks" */
export function describeTreatment(treatment: Pick<Treatment, 'steps'>) {
  const count = treatment.steps.length
  const days = treatment.steps.reduce(
    (sum, step) => sum + (step.gapValue ?? 0) * (step.gapUnit === 'WEEKS' ? 7 : 1),
    0,
  )
  const appointments = `${count} ${count === 1 ? 'appointment' : 'appointments'}`
  if (days === 0) return appointments
  const span = days % 7 === 0 ? plural(days / 7, 'WEEKS') : plural(days, 'DAYS')
  return `${appointments} over ${span}`
}
