/**
 * Clinic opening hours and calendar rules, worked out in the clinic's own
 * time zone (the servers run in UTC).
 *
 * Opening hours are set per day of the week by an admin in the agenda (stored
 * in the database, see weeklyHours.ts). Until then the defaults come from
 * CLINIC_HOURS (default "09:00-18:00"), Monday to Friday.
 * CLINIC_TIME_ZONE (default America/Guayaquil) sets the clinic's time zone.
 */
export const CLINIC_TIME_ZONE = process.env.CLINIC_TIME_ZONE ?? 'America/Guayaquil'

function parseHours(value: string) {
  const match = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return { start: 9 * 60, end: 18 * 60 }
  const [, sh, sm, eh, em] = match.map(Number) as [number, number, number, number, number]
  return { start: sh * 60 + sm, end: eh * 60 + em }
}

/** One day of the week's hours. Times are minutes after midnight (clinic time). */
export interface DayHours {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  open: boolean
  opensAt: number
  closesAt: number
}

/** Seven entries, indexed by weekday (0 = Sunday). */
export type WeeklyHours = readonly DayHours[]

export function defaultWeeklyHours(): DayHours[] {
  const { start, end } = parseHours(process.env.CLINIC_HOURS ?? '09:00-18:00')
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    open: weekday >= 1 && weekday <= 5,
    opensAt: start,
    closesAt: end,
  }))
}

/** Minutes between candidate start times when looking for a free slot. */
const SLOT_STEP = 15

/** A calendar day in the clinic's time zone. */
export interface ClinicDay {
  year: number
  month: number
  day: number
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
})

/** The clinic-local day and minute-of-day of an instant. */
export function toClinicTime(date: Date) {
  const parts = Object.fromEntries(
    partsFormatter.formatToParts(date).map((part) => [part.type, part.value]),
  )
  return {
    day: { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) },
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

/** The instant of a clinic-local day and minute-of-day. */
export function fromClinicTime(day: ClinicDay, minutes: number) {
  const guess = Date.UTC(day.year, day.month - 1, day.day, 0, minutes)
  // Correct for the zone's offset (checked twice to handle DST changes).
  let result = guess
  for (let i = 0; i < 2; i++) {
    const local = toClinicTime(new Date(result))
    const localAsUtc = Date.UTC(local.day.year, local.day.month - 1, local.day.day, 0, local.minutes)
    result += guess - localAsUtc
  }
  return new Date(result)
}

export function addDays(day: ClinicDay, days: number): ClinicDay {
  const date = new Date(Date.UTC(day.year, day.month - 1, day.day + days))
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

/** 0 = Sunday … 6 = Saturday */
export function weekday(day: ClinicDay) {
  return new Date(Date.UTC(day.year, day.month - 1, day.day)).getUTCDay()
}

/** "YYYY-MM-DD" for a clinic day. */
export function dayKey(day: ClinicDay) {
  return `${day.year}-${String(day.month).padStart(2, '0')}-${String(day.day).padStart(2, '0')}`
}

export function parseDayKey(key: string): ClinicDay {
  const [year, month, day] = key.split('-').map(Number) as [number, number, number]
  return { year, month, day }
}

function hoursOn(day: ClinicDay, hours: WeeklyHours) {
  return hours[weekday(day)] ?? { weekday: weekday(day), open: false, opensAt: 0, closesAt: 0 }
}

/** Open: the clinic opens that day of the week and it isn't in `closed` (holidays). */
export function isWorkingDay(
  day: ClinicDay,
  hours: WeeklyHours,
  closed: ReadonlySet<string> = new Set(),
) {
  return hoursOn(day, hours).open && !closed.has(dayKey(day))
}

/** Closed every week on this day (e.g. Sundays), regardless of holidays. */
export function isRegularlyClosed(day: ClinicDay, hours: WeeklyHours) {
  return !hoursOn(day, hours).open
}

/** Within that day's opening hours. */
export function isWithinOpeningHours(start: Date, durationMinutes: number, hours: WeeklyHours) {
  const { day, minutes } = toClinicTime(start)
  const today = hoursOn(day, hours)
  return today.open && minutes >= today.opensAt && minutes + durationMinutes <= today.closesAt
}

/**
 * The nearest day the clinic is regularly open, checking the day before
 * first at each distance (so Saturday goes to Friday, Sunday to Monday when
 * open Monday to Friday).
 */
export function nearestWorkingDay(day: ClinicDay, hours: WeeklyHours) {
  if (!isRegularlyClosed(day, hours)) return day
  for (let distance = 1; distance <= 6; distance++) {
    const before = addDays(day, -distance)
    if (!isRegularlyClosed(before, hours)) return before
    const after = addDays(day, distance)
    if (!isRegularlyClosed(after, hours)) return after
  }
  return day
}

export function nextWorkingDay(
  day: ClinicDay,
  hours: WeeklyHours,
  closed: ReadonlySet<string> = new Set(),
) {
  let next = addDays(day, 1)
  for (let i = 0; i < 366 && !isWorkingDay(next, hours, closed); i++) next = addDays(next, 1)
  return next
}

export function formatClock(minutes: number) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

export interface BusyPeriod {
  start: number
  end: number
}

function overlaps(start: number, end: number, busy: BusyPeriod[]) {
  return busy.some((period) => start < period.end && period.start < end)
}

/**
 * The first free start time on `day` at or after `fromMinutes` that fits
 * inside that day's opening hours, or on the following open days from
 * opening time.
 */
export function findFreeSlot(
  day: ClinicDay,
  fromMinutes: number,
  durationMinutes: number,
  busy: BusyPeriod[],
  notBefore: number,
  hours: WeeklyHours,
  closed: ReadonlySet<string> = new Set(),
) {
  let current = day
  let from = fromMinutes
  for (let attempt = 0; attempt < 120; attempt++) {
    if (isWorkingDay(current, hours, closed)) {
      const today = hoursOn(current, hours)
      for (
        let minutes = Math.max(from, today.opensAt);
        minutes + durationMinutes <= today.closesAt;
        minutes += SLOT_STEP
      ) {
        const start = fromClinicTime(current, minutes).getTime()
        const end = start + durationMinutes * 60_000
        if (start >= notBefore && !overlaps(start, end, busy)) return new Date(start)
      }
    }
    current = nextWorkingDay(current, hours, closed)
    from = 0
  }
  return null
}

export function parseClock(value: string) {
  const [hoursPart, minutesPart] = value.split(':').map(Number)
  return (hoursPart ?? 0) * 60 + (minutesPart ?? 0)
}

/** Opening hours as the web app receives them. */
export function scheduleRules(hours: WeeklyHours) {
  return {
    timeZone: CLINIC_TIME_ZONE,
    days: hours.map((day) => ({
      weekday: day.weekday,
      open: day.open,
      opensAt: formatClock(day.opensAt),
      closesAt: formatClock(day.closesAt),
    })),
  }
}
