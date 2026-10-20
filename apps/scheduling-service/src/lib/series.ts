import { closedDaysBetween, planningWindow } from './closedDays.js'
import {
  addDays,
  dayKey,
  findFreeSlot,
  isWeekendDay,
  nextWorkingDay,
  fromClinicTime,
  nearestWorkingDay,
  toClinicTime,
  type BusyPeriod,
} from './clinicHours.js'
import { Appointment, stepGap, type TreatmentDoc } from '../models/index.js'

export interface PlannedAppointment {
  stepNumber: number
  name: string
  description: string | null
  startsAt: Date
  /** The date the interval alone would give, before any adjustment. */
  plannedFor: Date
  /** Why the appointment isn't at the planned time, if it was moved. */
  movedBecause: 'weekend' | 'closed' | 'clash' | null
}

/** Days after the previous appointment for step `index` (0 for the first). */
function gapInDays(treatment: TreatmentDoc, index: number) {
  const gap = stepGap(treatment, index)
  return gap ? gap.value * (gap.unit === 'WEEKS' ? 7 : 1) : 0
}

/** Booked appointments (not cancelled) between two instants. */
async function busyPeriods(from: Date, to: Date): Promise<BusyPeriod[]> {
  const appointments = await Appointment.find({
    status: { $ne: 'CANCELLED' },
    // Includes anything that started up to a day earlier and runs into the range.
    startsAt: { $gte: new Date(from.getTime() - 24 * 3_600_000), $lte: to },
  }).lean()
  return appointments.map((appointment) => {
    const start = new Date(appointment.startsAt).getTime()
    return { start, end: start + appointment.durationMinutes * 60_000 }
  })
}

/**
 * Works out the date and time of every appointment in a treatment course.
 * The first is at `firstStart`; each later one is its step's gap (days or
 * weeks) after the date the previous appointment actually landed on:
 * - a date on a Saturday or Sunday moves to the nearest weekday;
 * - every appointment keeps the first one's time of day;
 * - if that time clashes with a booked appointment (or doesn't fit before
 *   closing), it moves to the next free slot that day, or the next working day.
 */
export async function planSeries(
  treatment: TreatmentDoc,
  firstStart: Date,
  durationMinutes: number,
): Promise<PlannedAppointment[]> {
  const first = toClinicTime(firstStart)
  const totalDays = treatment.steps.reduce((sum, _step, index) => sum + gapInDays(treatment, index), 0)
  const lastPlanned = addDays(first.day, totalDays + 60)
  const lastInstant = new Date(Date.UTC(lastPlanned.year, lastPlanned.month - 1, lastPlanned.day))
  const busy = await busyPeriods(firstStart, lastInstant)
  const window = planningWindow(first.day, totalDays)
  const closed = await closedDaysBetween(window.from, window.to)

  const plan: PlannedAppointment[] = []
  for (const [index, step] of treatment.steps.entries()) {
    const previousPlaced = plan.at(-1)
    const idealDay = previousPlaced
      ? addDays(toClinicTime(previousPlaced.startsAt).day, gapInDays(treatment, index))
      : first.day
    let day = nearestWorkingDay(idealDay)
    // A holiday (closed date) moves on to the next open day.
    if (closed.has(dayKey(day))) day = nextWorkingDay(day, closed)
    const dayReason = isWeekendDay(idealDay) ? 'weekend' : closed.has(dayKey(idealDay)) ? 'closed' : null
    const plannedFor = fromClinicTime(idealDay, first.minutes)
    // Each appointment must come after the previous one.
    const previous = plan.at(-1)
    const notBefore = previous
      ? previous.startsAt.getTime() + durationMinutes * 60_000
      : Date.now()

    const startsAt = findFreeSlot(day, first.minutes, durationMinutes, busy, notBefore, closed)
    if (!startsAt) {
      throw new Error(`No free time found for appointment ${index + 1}.`)
    }
    busy.push({ start: startsAt.getTime(), end: startsAt.getTime() + durationMinutes * 60_000 })

    const atPlannedTime = startsAt.getTime() === plannedFor.getTime()
    const movedDay = day.day !== idealDay.day || day.month !== idealDay.month
    plan.push({
      stepNumber: index + 1,
      name: step.name,
      description: step.description ?? null,
      startsAt,
      plannedFor,
      movedBecause: atPlannedTime
        ? null
        : movedDay && sameClinicTime(startsAt, day, first.minutes)
          ? (dayReason ?? 'weekend')
          : 'clash',
    })
  }
  return plan
}

function sameClinicTime(date: Date, day: { year: number; month: number; day: number }, minutes: number) {
  const local = toClinicTime(date)
  return (
    local.minutes === minutes &&
    local.day.year === day.year &&
    local.day.month === day.month &&
    local.day.day === day.day
  )
}
