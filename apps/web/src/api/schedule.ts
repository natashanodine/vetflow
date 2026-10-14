import type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../types/schedule'

const scheduleApiBase = '/api/schedule'

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${scheduleApiBase}${path}`, init)

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

export function getAppointments(options?: {
  from?: Date
  to?: Date
}): Promise<Appointment[]> {
  const searchParams = new URLSearchParams()

  if (options?.from) {
    searchParams.set('from', options.from.toISOString())
  }

  if (options?.to) {
    searchParams.set('to', options.to.toISOString())
  }

  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : ''
  return apiRequest<Appointment[]>(`/appointments${query}`)
}

export function createAppointment(
  input: CreateAppointmentInput,
): Promise<Appointment> {
  return apiRequest<Appointment>('/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function getAppointmentById(
  appointmentId: string,
): Promise<Appointment> {
  return apiRequest<Appointment>(`/appointments/${appointmentId}`)
}

export function updateAppointment(
  appointmentId: string,
  input: UpdateAppointmentInput,
): Promise<Appointment> {
  return apiRequest<Appointment>(`/appointments/${appointmentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}
