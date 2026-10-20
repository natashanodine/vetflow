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
  /** How long after the previous appointment; null for the first (the start date). */
  gapValue: number | null
  gapUnit: IntervalUnit | null
}

export interface Treatment {
  id: string
  name: string
  description: string | null
  steps: TreatmentStep[]
  createdAt: string
  updatedAt: string
}

export interface TreatmentInput {
  name: string
  description?: string
  steps: { name: string; description?: string; gapValue?: number; gapUnit?: IntervalUnit }[]
}

export interface PlannedAppointment {
  stepNumber: number
  name: string
  description: string | null
  startsAt: string
  plannedFor: string
  movedBecause: 'weekend' | 'closed' | 'clash' | null
}

/** One day of the week's opening hours. */
export interface DayHours {
  /** 0 = Sunday … 6 = Saturday */
  weekday: number
  open: boolean
  /** "HH:MM" */
  opensAt: string
  closesAt: string
}

export interface ScheduleRules {
  timeZone: string
  /** Seven entries, Sunday first. */
  days: DayHours[]
}

/** Sent after the person confirmed a warning about the date. */
export interface BookingConfirmations {
  /** Book on a weekend or a closed date. */
  allowClosedDay?: boolean
  /** Record an appointment in the past. */
  allowPast?: boolean
}

/** A date the clinic is closed, "YYYY-MM-DD". */
export interface ClosedDay {
  date: string
  reason: string | null
}

export interface CreateAppointmentInput extends BookingConfirmations {
  patientId: string
  title: string
  details?: string
  startsAt: string
  durationMinutes?: number
  category?: AppointmentCategory
}

export interface UpdateAppointmentInput extends BookingConfirmations {
  patientId?: string
  title?: string
  details?: string
  startsAt?: string
  durationMinutes?: number
  category?: AppointmentCategory
  status?: AppointmentStatus
}
