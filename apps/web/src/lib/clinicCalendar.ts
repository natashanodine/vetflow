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
