export interface ClinicPatient {
  id: string
  name: string
  ownerId: string
}

function clinicServiceUrl() {
  return process.env.CLINIC_SERVICE_URL ?? 'http://localhost:3001'
}

/** Looks a patient up in clinic-service. */
export async function fetchPatient(
  patientId: string,
): Promise<{ patient: ClinicPatient } | { missing: true } | { failedStatus: number }> {
  const response = await fetch(`${clinicServiceUrl()}/patients/${patientId}`, {
    headers: { 'x-internal-token': process.env.INTERNAL_API_TOKEN ?? '' },
  })
  if (response.status === 404) return { missing: true }
  if (!response.ok) return { failedStatus: response.status }
  return { patient: (await response.json()) as ClinicPatient }
}
