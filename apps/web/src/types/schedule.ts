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
  /** Set when the appointment is part of a booked treatment course. */
  treatment: AppointmentTreatment | null
  createdAt: string
  updatedAt: string
}

export interface AppointmentTreatment {
  id: string | null
  name: string
  seriesId: string
  stepNumber: number
  stepCount: number
}

export type IntervalUnit = 'DAYS' | 'WEEKS'

export interface TreatmentStep {
  name: string
  description: string | null
}

export interface Treatment {
  id: string
  name: string
  description: string | null
  intervalValue: number
  intervalUnit: IntervalUnit
  steps: TreatmentStep[]
  createdAt: string
  updatedAt: string
}

export interface TreatmentInput {
  name: string
  description?: string
  intervalValue: number
  intervalUnit: IntervalUnit
  steps: { name: string; description?: string }[]
}

export interface PlannedAppointment {
  stepNumber: number
  name: string
  description: string | null
  startsAt: string
  plannedFor: string
  movedBecause: 'weekend' | 'clash' | null
}

export interface ScheduleRules {
  timeZone: string
  /** "HH:MM" */
  opensAt: string
  closesAt: string
  /** 1 = Monday … 5 = Friday */
  workingDays: number[]
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
