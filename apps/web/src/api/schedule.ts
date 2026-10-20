import { request } from './http'
import { jsonRequest } from './http'
import type {
  Appointment,
  ClosedDay,
  CreateAppointmentInput,
  PlannedAppointment,
  ScheduleRules,
  Treatment,
  TreatmentInput,
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

export function getScheduleRules(): Promise<ScheduleRules> {
  return apiRequest<ScheduleRules>('/schedule-rules')
}

export function getTreatments(): Promise<Treatment[]> {
  return apiRequest<Treatment[]>('/treatments')
}

export function createTreatment(input: TreatmentInput): Promise<Treatment> {
  return apiRequest<Treatment>('/treatments', jsonRequest('POST', input))
}

export function updateTreatment(treatmentId: string, input: TreatmentInput): Promise<Treatment> {
  return apiRequest<Treatment>(`/treatments/${treatmentId}`, jsonRequest('PUT', input))
}

export function deleteTreatment(treatmentId: string): Promise<void> {
  return apiRequest<void>(`/treatments/${treatmentId}`, { method: 'DELETE' })
}

export interface TreatmentBookingInput {
  startsAt: string
  durationMinutes: number
  patientId?: string
  details?: string
}

/** The dates a treatment course would get, without booking anything. */
export function previewTreatment(
  treatmentId: string,
  input: TreatmentBookingInput,
): Promise<{ treatment: Treatment; appointments: PlannedAppointment[] }> {
  return apiRequest(`/treatments/${treatmentId}/preview`, jsonRequest('POST', input))
}

/** Books every appointment of a treatment course for a patient. */
export function bookTreatment(
  treatmentId: string,
  input: TreatmentBookingInput & { patientId: string },
): Promise<{ seriesId: string; appointments: Appointment[] }> {
  return apiRequest(`/treatments/${treatmentId}/book`, jsonRequest('POST', input))
}

/**
 * Deletes an appointment; scope "following" also deletes the later
 * appointments of the same treatment course. Returns the deleted ids.
 */
export function deleteAppointment(
  appointmentId: string,
  scope: 'this' | 'following' = 'this',
): Promise<{ deleted: string[] }> {
  return apiRequest(`/appointments/${appointmentId}?scope=${scope}`, { method: 'DELETE' })
}

export function getClosedDays(): Promise<ClosedDay[]> {
  return apiRequest<ClosedDay[]>('/closed-days')
}

/** Marks a date closed (or changes its reason). */
export function setClosedDay(
  date: string,
  reason: string,
): Promise<ClosedDay & { appointmentsThatDay: number }> {
  return apiRequest(`/closed-days/${date}`, jsonRequest('PUT', reason ? { reason } : {}))
}

export function reopenDay(date: string): Promise<void> {
  return apiRequest<void>(`/closed-days/${date}`, { method: 'DELETE' })
}
