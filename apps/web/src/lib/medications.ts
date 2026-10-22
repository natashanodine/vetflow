import type { Medication } from '../types/clinic'

/** e.g. " · 2 g · twice a day · until 30 Oct" */
export function describeMedication(medication: Medication) {
  const parts = [medication.dose, medication.frequency]
  if (medication.stoppedOn) parts.push(`stopped ${formatShortDate(medication.stoppedOn)}`)
  else if (medication.endDate) parts.push(`until ${formatShortDate(medication.endDate)}`)
  else parts.push('ongoing')
  const text = parts.filter(Boolean).join(' · ')
  return text ? ` · ${text}` : ''
}

export function formatShortDate(dateKey: string) {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(
    new Date(year!, month! - 1, day),
  )
}
