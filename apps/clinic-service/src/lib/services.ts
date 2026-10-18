/** Calls to sibling services, authenticated with the shared internal token. */

const identityUrl = () =>
  process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3003'
const schedulingUrl = () =>
  process.env.SCHEDULING_SERVICE_URL ?? 'http://localhost:3002'

function internalHeaders(extra: Record<string, string> = {}) {
  return {
    'x-internal-token': process.env.INTERNAL_API_TOKEN ?? '',
    ...extra,
  }
}

/** Names of all users, keyed by id, to show the responsible vet. */
export async function getUserDirectory(): Promise<Map<string, string>> {
  try {
    const response = await fetch(`${identityUrl()}/internal/users/directory`, {
      headers: internalHeaders(),
    })
    if (!response.ok) return new Map()
    const users = (await response.json()) as { id: string; name: string }[]
    return new Map(users.map((user) => [user.id, user.name]))
  } catch {
    return new Map()
  }
}

/** True when the user is an active vet (or an admin who is also a vet). */
export async function isAssignableVet(userId: string) {
  const response = await fetch(
    `${identityUrl()}/internal/vets/${encodeURIComponent(userId)}`,
    { headers: internalHeaders() },
  )
  return response.ok
}

export interface ScheduledAppointment {
  id: string
  patientId: string
  title: string
  startsAt: string
}

export async function getAppointment(
  appointmentId: string,
): Promise<ScheduledAppointment | null> {
  const response = await fetch(
    `${schedulingUrl()}/appointments/${encodeURIComponent(appointmentId)}`,
    { headers: internalHeaders() },
  )
  if (!response.ok) return null
  return (await response.json()) as ScheduledAppointment
}

/** Keeps the patient name/owner copied onto appointments up to date. */
export async function syncPatientToScheduling(
  patientId: string,
  data: { patientName?: string; ownerId?: string },
) {
  await fetch(
    `${schedulingUrl()}/internal/patients/${encodeURIComponent(patientId)}`,
    {
      method: 'PATCH',
      headers: internalHeaders({ 'content-type': 'application/json' }),
      body: JSON.stringify(data),
    },
  )
}
