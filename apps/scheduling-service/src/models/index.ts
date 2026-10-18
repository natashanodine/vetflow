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
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt,
  }
}
