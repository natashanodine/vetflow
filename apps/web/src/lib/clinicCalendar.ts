import type { DayHours, IntervalUnit, ScheduleRules, Treatment } from '../types/schedule'

/** Days of the week the clinic opens (0 = Sunday … 6 = Saturday). */
export type OpenWeekdays = ReadonlySet<number>

/** Until the hours load: Monday to Friday. */
export const DEFAULT_OPEN_WEEKDAYS: OpenWeekdays = new Set([1, 2, 3, 4, 5])

export function openWeekdaysOf(rules: ScheduleRules | null): OpenWeekdays {
  if (!rules) return DEFAULT_OPEN_WEEKDAYS
  return new Set(rules.days.filter((day) => day.open).map((day) => day.weekday))
}

function keyToDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year!, month! - 1, day)
}

/** A day of the week the clinic is normally closed (e.g. Sundays). */
export function isRegularlyClosed(date: Date, openWeekdays: OpenWeekdays = DEFAULT_OPEN_WEEKDAYS) {
  return !openWeekdays.has(date.getDay())
}

/** That date's hours, or null before the hours load. */
export function hoursOnDate(rules: ScheduleRules | null, dateKey: string): DayHours | null {
  if (!rules) return null
  const weekday = keyToDate(dateKey).getDay()
  return rules.days.find((day) => day.weekday === weekday) ?? null
}

function toMinutes(clock: string) {
  const [hours, minutes] = clock.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/** The appointment starts before opening or ends after closing that day. */
export function isOutsideHours(hours: DayHours | null, time: string, durationMinutes: number) {
  if (!hours || !hours.open || !time) return false
  const start = toMinutes(time)
  return start < toMinutes(hours.opensAt) || start + durationMinutes > toMinutes(hours.closesAt)
}

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
/** Monday first, as the hours are listed. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

/** e.g. "Mon–Fri 09:00–18:00 · Sat 09:00–13:00" */
export function summarizeHours(days: DayHours[]) {
  const byWeekday = new Map(days.map((day) => [day.weekday, day]))
  const groups: { first: number; last: number; hours: string }[] = []
  for (const weekday of WEEK_ORDER) {
    const day = byWeekday.get(weekday)
    if (!day?.open) continue
    const hours = `${day.opensAt}–${day.closesAt}`
    const previous = groups.at(-1)
    const lastIndex = previous ? WEEK_ORDER.indexOf(previous.last) : -2
    if (previous && previous.hours === hours && WEEK_ORDER.indexOf(weekday) === lastIndex + 1) {
      previous.last = weekday
    } else {
      groups.push({ first: weekday, last: weekday, hours })
    }
  }
  if (groups.length === 0) return 'Closed every day'
  return groups
    .map((group) =>
      group.first === group.last
        ? `${SHORT_DAY[group.first]} ${group.hours}`
        : `${SHORT_DAY[group.first]}–${SHORT_DAY[group.last]} ${group.hours}`,
    )
    .join(' · ')
}

/** Closed dates by "YYYY-MM-DD", with their reason (or null). */
export type ClosedDayMap = ReadonlyMap<string, string | null>

export function todayKey() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export interface DayWarnings {
  /** The whole day is before today. */
  isPastDay: boolean
  /** A day of the week the clinic is normally closed. */
  isRegularlyClosed: boolean
  /** Set when the date is marked closed; empty string if no reason was given. */
  closedReason: string | null
}

export function dayWarnings(
  dateKey: string,
  closedDays: ClosedDayMap,
  openWeekdays: OpenWeekdays = DEFAULT_OPEN_WEEKDAYS,
): DayWarnings {
  return {
    isPastDay: dateKey < todayKey(),
    isRegularlyClosed: isRegularlyClosed(keyToDate(dateKey), openWeekdays),
    closedReason: closedDays.has(dateKey) ? (closedDays.get(dateKey) ?? '') : null,
  }
}

export function hasDayWarning(warnings: DayWarnings) {
  return warnings.isPastDay || warnings.isRegularlyClosed || warnings.closedReason !== null
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
  if (warnings.isRegularlyClosed) {
    sentences.push(`This is a ${weekdayName}. The clinic is normally closed on ${weekdayName}s.`)
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
