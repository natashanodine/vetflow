import { ClosedDay } from '../models/index.js'
import {
  addDays,
  dayKey,
  isRegularlyClosed,
  toClinicTime,
  weekday,
  type ClinicDay,
} from './clinicHours.js'
import { getWeeklyHours } from './weeklyHours.js'

/** Closed dates between two clinic days (inclusive), as day keys. */
export async function closedDaysBetween(from: ClinicDay, to: ClinicDay) {
  const days = await ClosedDay.find({ _id: { $gte: dayKey(from), $lte: dayKey(to) } }, { _id: 1 }).lean()
  return new Set(days.map((day) => day._id))
}

export type Closure = { kind: 'weekly'; weekday: number } | { kind: 'holiday'; reason: string | null }

const weekdayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays']

/** Why the clinic is closed on the day of `date`, or null if it's open. */
export async function closureOn(date: Date): Promise<Closure | null> {
  const { day } = toClinicTime(date)
  const holiday = await ClosedDay.findById(dayKey(day)).lean()
  if (holiday) return { kind: 'holiday', reason: holiday.reason ?? null }
  if (isRegularlyClosed(day, await getWeeklyHours())) return { kind: 'weekly', weekday: weekday(day) }
  return null
}

export function describeClosure(closure: Closure) {
  if (closure.kind === 'weekly') return `The clinic is closed on ${weekdayNames[closure.weekday]}`
  return closure.reason
    ? `The clinic is closed on this date (${closure.reason})`
    : 'The clinic is closed on this date'
}

/** A generous window of closed days for planning a treatment course. */
export function planningWindow(first: ClinicDay, totalDays: number) {
  return { from: first, to: addDays(first, totalDays + 120) }
}
