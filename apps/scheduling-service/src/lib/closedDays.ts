import { ClosedDay } from '../models/index.js'
import { addDays, dayKey, isWeekendDay, toClinicTime, type ClinicDay } from './clinicHours.js'

/** Closed dates between two clinic days (inclusive), as day keys. */
export async function closedDaysBetween(from: ClinicDay, to: ClinicDay) {
  const days = await ClosedDay.find({ _id: { $gte: dayKey(from), $lte: dayKey(to) } }, { _id: 1 }).lean()
  return new Set(days.map((day) => day._id))
}

export type Closure = { kind: 'weekend' } | { kind: 'holiday'; reason: string | null }

/** Why the clinic is closed on the day of `date`, or null if it's open. */
export async function closureOn(date: Date): Promise<Closure | null> {
  const { day } = toClinicTime(date)
  const holiday = await ClosedDay.findById(dayKey(day)).lean()
  if (holiday) return { kind: 'holiday', reason: holiday.reason ?? null }
  if (isWeekendDay(day)) return { kind: 'weekend' }
  return null
}

export function describeClosure(closure: Closure) {
  if (closure.kind === 'weekend') return 'The clinic is closed on Saturdays and Sundays'
  return closure.reason
    ? `The clinic is closed on this date (${closure.reason})`
    : 'The clinic is closed on this date'
}

/** A generous window of closed days for planning a treatment course. */
export function planningWindow(first: ClinicDay, totalDays: number) {
  return { from: first, to: addDays(first, totalDays + 120) }
}
