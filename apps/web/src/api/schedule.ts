import { request } from './http'
import type {
  Appointment,
  CreateAppointmentInput,
  UpdateAppointmentInput,
} from '../types/schedule'

const scheduleApiBase = '/api/schedule'

function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(`${scheduleApiBase}${path}`, init)
}

export function getAppointments(options?: {
  from?: Date
  to?: Date
  patientId?: string
}): Promise<Appointment[]> {
  const searchParams = new URLSearchParams()

  if (options?.patientId) {
    searchParams.set('patientId', options.patientId)
  }

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
