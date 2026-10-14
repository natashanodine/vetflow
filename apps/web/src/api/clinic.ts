import type {
  CreateOwnerInput,
  CreatePatientInput,
  Owner,
  Patient,
} from '../types/clinic'

const clinicApiBase = '/api/clinic'

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${clinicApiBase}${path}`, init)

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => null)) as {
      message?: string
    } | null
    throw new Error(
      errorBody?.message ?? `Request failed with status ${response.status}`,
    )
  }

  return response.json() as Promise<T>
}

export function getOwners(): Promise<Owner[]> {
  return apiRequest<Owner[]>('/owners')
}

export function getOwnerById(ownerId: string): Promise<Owner> {
  return apiRequest<Owner>(`/owners/${ownerId}`)
}

export function getPatients(): Promise<Patient[]> {
  return apiRequest<Patient[]>('/patients')
}

export function getPatientById(patientId: string): Promise<Patient> {
  return apiRequest<Patient>(`/patients/${patientId}`)
}

export function createOwner(input: CreateOwnerInput): Promise<Owner> {
  return apiRequest<Owner>('/owners', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function createPatient(
  ownerId: string,
  input: CreatePatientInput,
): Promise<Patient> {
  return apiRequest<Patient>(`/owners/${ownerId}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function createOwnerWithPatient(
  owner: CreateOwnerInput,
  patient: CreatePatientInput,
): Promise<Patient> {
  return apiRequest<Patient>('/patients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ owner, patient }),
  })
}
