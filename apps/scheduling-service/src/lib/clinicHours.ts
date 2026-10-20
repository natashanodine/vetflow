/**
 * Clinic opening hours and calendar rules, worked out in the clinic's own
 * time zone (the servers run in UTC).
 *
 * Settings (environment): CLINIC_TIME_ZONE (default America/Guayaquil) and
 * CLINIC_HOURS (default "09:00-18:00"). Open Monday to Friday.
 */
export const CLINIC_TIME_ZONE = process.env.CLINIC_TIME_ZONE ?? 'America/Guayaquil'

function parseHours(value: string) {
  const match = /^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) return { start: 9 * 60, end: 18 * 60 }
  const [, sh, sm, eh, em] = match.map(Number) as [number, number, number, number, number]
  return { start: sh * 60 + sm, end: eh * 60 + em }
}

const hours = parseHours(process.env.CLINIC_HOURS ?? '09:00-18:00')
/** Opening and closing time, in minutes after midnight (clinic time). */
export const OPENS_AT = hours.start
export const CLOSES_AT = hours.end
/** Days the clinic is open: 1 = Monday … 5 = Friday. */
export const WORKING_DAYS = [1, 2, 3, 4, 5]

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

export function isWorkingDay(day: ClinicDay) {
  return WORKING_DAYS.includes(weekday(day))
}

export function isOnWorkingDay(date: Date) {
  return isWorkingDay(toClinicTime(date).day)
}

export function isWithinOpeningHours(start: Date, durationMinutes: number) {
  const { day, minutes } = toClinicTime(start)
  return isWorkingDay(day) && minutes >= OPENS_AT && minutes + durationMinutes <= CLOSES_AT
}

/** Saturday moves back to Friday, Sunday forward to Monday. */
export function nearestWorkingDay(day: ClinicDay) {
  const dow = weekday(day)
  if (dow === 6) return addDays(day, -1)
  if (dow === 0) return addDays(day, 1)
  return day
}

export function nextWorkingDay(day: ClinicDay) {
  let next = addDays(day, 1)
  while (!isWorkingDay(next)) next = addDays(next, 1)
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
 * inside opening hours, or on the following working days from opening time.
 */
export function findFreeSlot(
  day: ClinicDay,
  fromMinutes: number,
  durationMinutes: number,
  busy: BusyPeriod[],
  notBefore: number,
) {
  let current = day
  let from = Math.max(fromMinutes, OPENS_AT)
  for (let attempt = 0; attempt < 120; attempt++) {
    if (isWorkingDay(current)) {
      for (let minutes = from; minutes + durationMinutes <= CLOSES_AT; minutes += SLOT_STEP) {
        const start = fromClinicTime(current, minutes).getTime()
        const end = start + durationMinutes * 60_000
        if (start >= notBefore && !overlaps(start, end, busy)) return new Date(start)
      }
    }
    current = nextWorkingDay(current)
    from = OPENS_AT
  }
  return null
}

export function scheduleRules() {
  return {
    timeZone: CLINIC_TIME_ZONE,
    opensAt: formatClock(OPENS_AT),
    closesAt: formatClock(CLOSES_AT),
    workingDays: WORKING_DAYS,
  }
}
