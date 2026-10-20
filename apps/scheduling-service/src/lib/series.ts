import {
  addDays,
  findFreeSlot,
  fromClinicTime,
  nearestWorkingDay,
  toClinicTime,
  type BusyPeriod,
} from './clinicHours.js'
import { Appointment, type TreatmentDoc } from '../models/index.js'

export interface PlannedAppointment {
  stepNumber: number
  name: string
  description: string | null
  startsAt: Date
  /** The date the interval alone would give, before any adjustment. */
  plannedFor: Date
  /** Why the appointment isn't at the planned time, if it was moved. */
  movedBecause: 'weekend' | 'clash' | null
}

export function intervalInDays(treatment: Pick<TreatmentDoc, 'intervalValue' | 'intervalUnit'>) {
  return treatment.intervalValue * (treatment.intervalUnit === 'WEEKS' ? 7 : 1)
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
 * Works out the date and time of every appointment in a treatment course,
 * starting at `firstStart` and repeating at the plan's interval:
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
  const stepDays = intervalInDays(treatment)
  const lastPlanned = addDays(first.day, stepDays * (treatment.steps.length - 1) + 60)
  const lastInstant = new Date(Date.UTC(lastPlanned.year, lastPlanned.month - 1, lastPlanned.day))
  const busy = await busyPeriods(firstStart, lastInstant)

  const plan: PlannedAppointment[] = []
  for (const [index, step] of treatment.steps.entries()) {
    const idealDay = addDays(first.day, stepDays * index)
    const day = nearestWorkingDay(idealDay)
    const plannedFor = fromClinicTime(idealDay, first.minutes)
    // Each appointment must come after the previous one.
    const previous = plan.at(-1)
    const notBefore = previous
      ? previous.startsAt.getTime() + durationMinutes * 60_000
      : Date.now()

    const startsAt = findFreeSlot(day, first.minutes, durationMinutes, busy, notBefore)
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
      movedBecause: atPlannedTime ? null : movedDay && sameClinicTime(startsAt, day, first.minutes) ? 'weekend' : 'clash',
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
