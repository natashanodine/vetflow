import type { ClinicRole, TeamMember, TeamMemberInput, Vet } from '../types/clinic'
import { jsonRequest, request } from './http'

const identityApiBase = '/api/identity'

export interface CurrentUser {
  id: string
  name: string
  email: string
  role: ClinicRole
  isVeterinarian: boolean
}

export interface Session {
  user: CurrentUser
  clinic: { name: string }
}

function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`${identityApiBase}${path}`, init)
}

/** Returns null when nobody is signed in (without redirecting). */
/**
 * Wakes the backend services if they have gone to sleep (free hosting plans
 * do this after a quiet period). Resolves quickly when they are already up.
 */
export async function wakeServices() {
  const deadline = Date.now() + 180_000
  while (Date.now() < deadline) {
    try {
      const response = await fetch('/api/wake', {
        signal: AbortSignal.timeout(160_000),
      })
      const body = (await response.json().catch(() => null)) as { ready?: boolean } | null
      if (response.ok && body?.ready) return true
    } catch {
      // The gateway itself may still be starting; try again shortly.
    }
    await new Promise((resolve) => setTimeout(resolve, 3_000))
  }
  return false
}

export async function getSession(): Promise<Session | null> {
  const response = await fetch(`${identityApiBase}/auth/me`, {
    credentials: 'same-origin',
  })
  if (response.status === 401) return null
  if (!response.ok) throw new Error('Unable to check your sign-in')
  return response.json() as Promise<Session>
}

/** Statuses a sleeping or still-starting backend answers with. */
const WAKING_STATUSES = new Set([502, 503, 504])

export async function login(email: string, password: string) {
  const attempt = () =>
    fetch(`${identityApiBase}/auth/login`, {
      ...jsonRequest('POST', { email, password }),
      credentials: 'same-origin',
    })

  let response = await attempt()
  // The services may have gone back to sleep since the page loaded: wake
  // them and try again instead of showing an error.
  for (let retry = 0; retry < 2 && WAKING_STATUSES.has(response.status); retry++) {
    await wakeServices()
    response = await attempt()
  }

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
    } | null
    throw new Error(body?.message ?? 'Unable to sign in right now.')
  }
}

export function logout() {
  return apiRequest<{ ok: true }>('/auth/logout', { method: 'POST' })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiRequest<{ ok: true }>(
    '/auth/change-password',
    jsonRequest('POST', { currentPassword, newPassword }),
  )
}

export function getTeam(): Promise<TeamMember[]> {
  return apiRequest<TeamMember[]>('/team')
}

export function createTeamMember(
  input: Required<Omit<TeamMemberInput, 'isActive' | 'isVeterinarian'>> & {
    isVeterinarian?: boolean
  },
): Promise<TeamMember> {
  return apiRequest<TeamMember>('/team', jsonRequest('POST', input))
}

export function updateTeamMember(
  userId: string,
  input: TeamMemberInput,
): Promise<TeamMember> {
  return apiRequest<TeamMember>(`/team/${userId}`, jsonRequest('PATCH', input))
}

export function deleteTeamMember(userId: string): Promise<void> {
  return apiRequest<void>(`/team/${userId}`, { method: 'DELETE' })
}

export function getVets(): Promise<Vet[]> {
  return apiRequest<Vet[]>('/vets')
}

export function updateClinicName(name: string): Promise<{ name: string }> {
  return apiRequest<{ name: string }>('/clinic', jsonRequest('PATCH', { name }))
}
