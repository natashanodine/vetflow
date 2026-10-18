import { jsonRequest, request } from './http'
import type {
  Attachment,
  CreateOwnerInput,
  CreatePatientInput,
  MedicalRecord,
  MedicalRecordInput,
  Owner,
  Patient,
  UpdateOwnerInput,
  UpdatePatientInput,
} from '../types/clinic'

const clinicApiBase = '/api/clinic'

function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`${clinicApiBase}${path}`, init)
}

function deleteRequest(path: string): Promise<void> {
  return request<void>(`${clinicApiBase}${path}`, { method: 'DELETE' })
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

export function getAttachments(
  patientId: string,
  appointmentId?: string,
): Promise<Attachment[]> {
  const query = appointmentId
    ? `?appointmentId=${encodeURIComponent(appointmentId)}`
    : ''
  return apiRequest<Attachment[]>(`/patients/${patientId}/attachments${query}`)
}

export function uploadAttachment(
  patientId: string,
  input: { file: File; note?: string; appointmentId?: string },
): Promise<Attachment> {
  const body = new FormData()
  body.set('file', input.file)
  if (input.note) body.set('note', input.note)
  if (input.appointmentId) body.set('appointmentId', input.appointmentId)

  return apiRequest<Attachment>(`/patients/${patientId}/attachments`, {
    method: 'POST',
    body,
  })
}

export function deleteAttachment(attachmentId: string): Promise<void> {
  return deleteRequest(`/attachments/${attachmentId}`)
}

export function updateOwner(
  ownerId: string,
  input: UpdateOwnerInput,
): Promise<Owner> {
  return apiRequest<Owner>(`/owners/${ownerId}`, jsonRequest('PATCH', input))
}

export function updatePatient(
  patientId: string,
  input: UpdatePatientInput,
): Promise<Patient> {
  return apiRequest<Patient>(
    `/patients/${patientId}`,
    jsonRequest('PATCH', input),
  )
}

export function getMedicalRecords(patientId: string): Promise<MedicalRecord[]> {
  return apiRequest<MedicalRecord[]>(`/patients/${patientId}/records`)
}

export function createMedicalRecord(
  patientId: string,
  input: MedicalRecordInput,
): Promise<MedicalRecord> {
  return apiRequest<MedicalRecord>(
    `/patients/${patientId}/records`,
    jsonRequest('POST', input),
  )
}

export function updateMedicalRecord(
  recordId: string,
  input: MedicalRecordInput,
): Promise<MedicalRecord> {
  return apiRequest<MedicalRecord>(
    `/records/${recordId}`,
    jsonRequest('PATCH', input),
  )
}

export function deleteMedicalRecord(recordId: string): Promise<void> {
  return deleteRequest(`/records/${recordId}`)
}

