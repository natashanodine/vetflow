import { ClinicHours } from '../models/index.js'
import { defaultWeeklyHours, type DayHours, type WeeklyHours } from './clinicHours.js'

/** The clinic's current weekly opening hours (defaults until an admin sets them). */
export async function getWeeklyHours(): Promise<WeeklyHours> {
  const stored = await ClinicHours.findById(1).lean()
  const hours = defaultWeeklyHours()
  for (const day of stored?.days ?? []) {
    if (day.weekday >= 0 && day.weekday <= 6) hours[day.weekday] = { ...day }
  }
  return hours
}

export async function saveWeeklyHours(days: DayHours[]) {
  await ClinicHours.updateOne({ _id: 1 }, { $set: { days } }, { upsert: true })
  return getWeeklyHours()
}
