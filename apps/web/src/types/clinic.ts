export interface PetSummary {
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
  pets: PetSummary[]
  createdAt: string
  updatedAt: string
}

export interface Pet {
  id: string
  ownerId: string
  name: string
  species: string
  breed: string | null
  sex: string
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