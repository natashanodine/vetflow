import type { IntervalUnit } from '../types/schedule'

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

export function describeInterval(value: number, unit: IntervalUnit) {
  const word = unit === 'WEEKS' ? 'week' : 'day'
  return value === 1 ? `every ${word}` : `every ${value} ${word}s`
}
