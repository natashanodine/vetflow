export type AppointmentCategory =
  | 'APPOINTMENT'
  | 'TREATMENT'
  | 'REPRODUCTION'

export type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  ownerId: string
  title: string
  details: string | null
  startsAt: string
  durationMinutes: number
  category: AppointmentCategory
  status: AppointmentStatus
  createdAt: string
  updatedAt: string
}

export interface CreateAppointmentInput {
  patientId: string
  title: string
  details?: string
  startsAt: string
  durationMinutes?: number
  category?: AppointmentCategory
}

export interface UpdateAppointmentInput {
  patientId?: string
  title?: string
  details?: string
  startsAt?: string
  durationMinutes?: number
  category?: AppointmentCategory
  status?: AppointmentStatus
}
