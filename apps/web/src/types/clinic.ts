export interface PatientSummary {
  id: string
  name: string
  species: string
  breed: string | null
}

export interface Owner {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string
  address: string | null
  patients: PatientSummary[]
  createdAt: string
  updatedAt: string
}

export interface Patient {
  id: string
  ownerId: string
  name: string
  species: string
  breed: string | null
  weightKg: number | null
  sex: string
  isNeutered: boolean
  dateOfBirth: string | null
  color: string | null
  microchip: string | null
  responsibleVetId: string | null
  responsibleVet: { id: string; name: string } | null
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string
  }
}

export interface CreateOwnerInput {
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: string
}

export interface CreatePatientInput {
  name: string
  species: string
  sex?: string
  isNeutered?: boolean
  breed?: string
  weightKg?: number | null
  dateOfBirth?: string
  color?: string
  microchip?: string
}

export interface Attachment {
  id: string
  patientId: string
  appointmentId: string | null
  fileName: string
  contentType: string
  sizeBytes: number
  note: string | null
  createdAt: string
  uploadedByName: string | null
  url: string
}

export interface UpdateOwnerInput {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  address?: string
}

export interface UpdatePatientInput {
  ownerId?: string
  name?: string
  species?: string
  breed?: string
  weightKg?: number | null
  sex?: string
  isNeutered?: boolean
  dateOfBirth?: string
  color?: string
  microchip?: string
  responsibleVetId?: string | null
}

export interface Vet {
  id: string
  name: string
  role: ClinicRole
}

export type MedicalRecordType =
  | 'EXAMINATION'
  | 'DIAGNOSIS'
  | 'TREATMENT'
  | 'VACCINATION'
  | 'PROCEDURE'
  | 'LAB_RESULT'
  | 'NOTE'

export interface MedicalRecord {
  id: string
  patientId: string
  appointmentId: string | null
  type: MedicalRecordType
  recordedAt: string
  title: string
  description: string | null
  weightKg: number | null
  temperatureC: number | null
  authorName: string | null
  createdAt: string
  updatedAt: string
}

export interface MedicalRecordInput {
  type: MedicalRecordType
  recordedAt: string
  title: string
  description: string
  weightKg: number | null
  temperatureC: number | null
  appointmentId: string | null
}

export type ClinicRole = 'ADMIN' | 'VETERINARIAN' | 'STAFF'

export interface TeamMember {
  userId: string
  name: string
  email: string
  isActive: boolean
  role: ClinicRole
  isVeterinarian: boolean
  addedAt: string
}

export interface TeamMemberInput {
  name?: string
  email?: string
  password?: string
  role?: ClinicRole
  isActive?: boolean
  isVeterinarian?: boolean
}
