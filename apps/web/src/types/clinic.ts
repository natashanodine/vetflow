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
  sex: string
  isNeutered: boolean
  dateOfBirth: string | null
  color: string | null
  microchip: string | null
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
  dateOfBirth?: string
  color?: string
  microchip?: string
}
