/** Today's date ("YYYY-MM-DD") in the clinic's time zone. */
export function clinicToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: process.env.CLINIC_TIME_ZONE ?? 'America/Guayaquil',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** A "YYYY-MM-DD" date as stored (UTC midnight). */
export function dateFromKey(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

export function keyFromDate(value: Date) {
  return value.toISOString().slice(0, 10)
}
