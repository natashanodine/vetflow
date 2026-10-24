export function formatAge(dateOfBirth: string | null, today = new Date()) {
  if (!dateOfBirth) return 'Unknown'
  const birth = new Date(dateOfBirth)

  let months =
    (today.getFullYear() - birth.getUTCFullYear()) * 12 +
    (today.getMonth() - birth.getUTCMonth())
  // This month's "birthday" (same day of the month) hasn't come yet.
  if (today.getDate() < birth.getUTCDate()) months -= 1

  if (months < 0) return 'Not born yet'
  if (months < 1) return 'under 1 month'

  const years = Math.floor(months / 12)
  const rest = months % 12
  const parts = []
  if (years > 0) parts.push(`${years} ${years === 1 ? 'year' : 'years'}`)
  if (rest > 0) parts.push(`${rest} ${rest === 1 ? 'month' : 'months'}`)
  return parts.join(' ')
}