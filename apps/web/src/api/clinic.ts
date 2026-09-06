import type { Owner, Pet } from '../types/clinic'

const clinicApiBase = '/api/clinic'

async function apiRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${clinicApiBase}${path}`)

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getOwners(): Promise<Owner[]> {
  return apiRequest<Owner[]>('/owners')
}

export function getPets(): Promise<Pet[]> {
  return apiRequest<Pet[]>('/pets')
}