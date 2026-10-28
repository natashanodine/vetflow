import { toDateKey } from '../data/calendarEvents'
import type { Appointment } from '../types/schedule'

export interface TreatmentEntry {
  key: string
  patientId: string
  patientName: string
  /** The course or appointment name. */
  name: string
  stepCount: number
  done: number
  next: Appointment | null
}

/**
 * Patients with a treatment in progress: treatment courses with appointments
 * still to come, and single treatment appointments in the next two weeks.
 */
export function patientsInTreatment(
  appointments: Appointment[],
  now: number,
  lookAheadEnd: string,
) {
  const isUpcoming = (appointment: Appointment) =>
    appointment.status === 'SCHEDULED' &&
    new Date(appointment.startsAt).getTime() + appointment.durationMinutes * 60_000 >= now
  const entries: TreatmentEntry[] = []

  const courses = new Map<string, Appointment[]>()
  for (const appointment of appointments) {
    if (!appointment.treatment) continue
    const list = courses.get(appointment.treatment.seriesId) ?? []
    list.push(appointment)
    courses.set(appointment.treatment.seriesId, list)
  }
  for (const [seriesId, list] of courses) {
    const remaining = list.filter(isUpcoming).sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    const next = remaining[0]
    if (!next) continue
    const course = next.treatment!
    entries.push({
      key: seriesId,
      patientId: next.patientId,
      patientName: next.patientName,
      name: course.name,
      stepCount: course.stepCount,
      // Earlier steps may be outside the loaded range, so count from the next one.
      done: Math.max(
        course.stepNumber - 1,
        list.filter((appointment) => appointment.status === 'COMPLETED').length,
      ),
      next,
    })
  }

  for (const appointment of appointments) {
    if (appointment.treatment || appointment.category !== 'TREATMENT') continue
    if (!isUpcoming(appointment) || toDateKey(new Date(appointment.startsAt)) > lookAheadEnd)
      continue
    entries.push({
      key: appointment.id,
      patientId: appointment.patientId,
      patientName: appointment.patientName,
      name: appointment.title,
      stepCount: 1,
      done: 0,
      next: appointment,
    })
  }

  return entries.sort(
    (a, b) =>
      a.patientName.localeCompare(b.patientName) ||
      (a.next?.startsAt ?? '').localeCompare(b.next?.startsAt ?? ''),
  )
}

/** e.g. "Injection 2" from "Joint therapy: Injection 2" */
export function stepName(appointment: Appointment) {
  const prefix = `${appointment.treatment!.name}: `
  return appointment.title.startsWith(prefix)
    ? appointment.title.slice(prefix.length)
    : appointment.title
}
