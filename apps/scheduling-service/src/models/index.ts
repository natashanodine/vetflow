import { Schema, model } from 'mongoose'
import { uuidId } from '../lib/db.js'

export const categories = ['APPOINTMENT', 'TREATMENT', 'REPRODUCTION'] as const
export const statuses = ['SCHEDULED', 'COMPLETED', 'CANCELLED'] as const

export interface AppointmentDoc {
  _id: string
  patientId: string
  /** Copied from clinic-service so the agenda doesn't need a lookup. */
  patientName: string
  ownerId: string
  title: string
  details?: string
  startsAt: Date
  durationMinutes: number
  category: (typeof categories)[number]
  status: (typeof statuses)[number]
  /** Set when the appointment was booked as part of a treatment plan. */
  treatmentId?: string
  treatmentName?: string
  /** Shared by all appointments booked together for one treatment course. */
  seriesId?: string
  stepNumber?: number
  stepCount?: number
  createdAt: Date
  updatedAt: Date
}

const appointmentSchema = new Schema<AppointmentDoc>(
  {
    _id: uuidId,
    patientId: { type: String, required: true, index: true },
    patientName: { type: String, required: true, maxlength: 100 },
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 160 },
    details: { type: String, maxlength: 5000 },
    startsAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 30 },
    category: { type: String, enum: categories, default: 'APPOINTMENT' },
    status: { type: String, enum: statuses, default: 'SCHEDULED' },
    treatmentId: { type: String },
    treatmentName: { type: String, maxlength: 120 },
    seriesId: { type: String, index: true },
    stepNumber: { type: Number },
    stepCount: { type: Number },
  },
  { timestamps: true, versionKey: false },
)

export const Appointment = model<AppointmentDoc>(
  'Appointment',
  appointmentSchema,
  'appointments',
)

export function serializeAppointment(appointment: AppointmentDoc) {
  return {
    id: appointment._id,
    patientId: appointment.patientId,
    patientName: appointment.patientName,
    ownerId: appointment.ownerId,
    title: appointment.title,
    details: appointment.details ?? null,
    startsAt: appointment.startsAt,
    durationMinutes: appointment.durationMinutes,
    category: appointment.category,
    status: appointment.status,
    treatment: appointment.seriesId
      ? {
          id: appointment.treatmentId ?? null,
          name: appointment.treatmentName ?? '',
          seriesId: appointment.seriesId,
          stepNumber: appointment.stepNumber ?? 1,
          stepCount: appointment.stepCount ?? 1,
        }
      : null,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }
}

export const intervalUnits = ['DAYS', 'WEEKS'] as const

export interface TreatmentStep {
  name: string
  description?: string
}

/** A reusable treatment plan: a named series of appointments at a set interval. */
export interface TreatmentDoc {
  _id: string
  name: string
  description?: string
  /** Time between appointments, e.g. every 2 WEEKS. */
  intervalValue: number
  intervalUnit: (typeof intervalUnits)[number]
  /** One entry per appointment, in order. */
  steps: TreatmentStep[]
  createdAt: Date
  updatedAt: Date
}

const treatmentSchema = new Schema<TreatmentDoc>(
  {
    _id: uuidId,
    name: { type: String, required: true, maxlength: 120 },
    description: { type: String, maxlength: 2000 },
    intervalValue: { type: Number, required: true, min: 1, max: 365 },
    intervalUnit: { type: String, enum: intervalUnits, required: true },
    steps: {
      type: [
        new Schema<TreatmentStep>(
          {
            name: { type: String, required: true, maxlength: 120 },
            description: { type: String, maxlength: 2000 },
          },
          { _id: false },
        ),
      ],
      validate: (steps: TreatmentStep[]) => steps.length >= 1 && steps.length <= 52,
    },
  },
  { timestamps: true, versionKey: false },
)

export const Treatment = model<TreatmentDoc>('Treatment', treatmentSchema, 'treatments')

export function serializeTreatment(treatment: TreatmentDoc) {
  return {
    id: treatment._id,
    name: treatment.name,
    description: treatment.description ?? null,
    intervalValue: treatment.intervalValue,
    intervalUnit: treatment.intervalUnit,
    steps: treatment.steps.map((step) => ({
      name: step.name,
      description: step.description ?? null,
    })),
    createdAt: treatment.createdAt,
    updatedAt: treatment.updatedAt,
  }
}
