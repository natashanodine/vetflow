import { Schema, model } from 'mongoose'
import { uuidId } from '../lib/db.js'

export const species = ['DOG', 'CAT', 'HORSE', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER'] as const
export const sexes = ['MALE', 'FEMALE', 'UNKNOWN'] as const
export const recordTypes = [
  'EXAMINATION',
  'DIAGNOSIS',
  'TREATMENT',
  'VACCINATION',
  'PROCEDURE',
  'LAB_RESULT',
  'NOTE',
] as const

export type Species = (typeof species)[number]
export type Sex = (typeof sexes)[number]
export type RecordType = (typeof recordTypes)[number]

// Optional fields are left out of the document when empty, and serializers
// turn them into null so the API looks the same as before.

export interface OwnerDoc {
  _id: string
  firstName: string
  lastName: string
  email?: string
  phone: string
  address?: string
  createdAt: Date
  updatedAt: Date
}

const ownerSchema = new Schema<OwnerDoc>(
  {
    _id: uuidId,
    firstName: { type: String, required: true, maxlength: 100 },
    lastName: { type: String, required: true, maxlength: 100 },
    email: { type: String, maxlength: 255, unique: true, sparse: true },
    phone: { type: String, required: true, maxlength: 30 },
    address: { type: String, maxlength: 500 },
  },
  { timestamps: true, versionKey: false },
)
ownerSchema.index({ lastName: 1, firstName: 1 })

export const Owner = model<OwnerDoc>('Owner', ownerSchema, 'owners')

export interface PatientDoc {
  _id: string
  ownerId: string
  name: string
  species: Species
  breed?: string
  sex: Sex
  isNeutered: boolean
  dateOfBirth?: Date
  color?: string
  microchip?: string
  /** User id (identity-service) of the vet responsible for this patient. */
  responsibleVetId?: string
  createdAt: Date
  updatedAt: Date
}

const patientSchema = new Schema<PatientDoc>(
  {
    _id: uuidId,
    ownerId: { type: String, required: true, index: true },
    name: { type: String, required: true, maxlength: 100, index: true },
    species: { type: String, enum: species, required: true },
    breed: { type: String, maxlength: 100 },
    sex: { type: String, enum: sexes, default: 'UNKNOWN' },
    isNeutered: { type: Boolean, default: false },
    dateOfBirth: { type: Date },
    color: { type: String, maxlength: 100 },
    microchip: { type: String, maxlength: 100, unique: true, sparse: true },
    responsibleVetId: { type: String, index: true },
  },
  { timestamps: true, versionKey: false },
)

export const Patient = model<PatientDoc>('Patient', patientSchema, 'patients')

export interface MedicalRecordDoc {
  _id: string
  patientId: string
  /** Appointment id (scheduling-service), when the entry relates to one. */
  appointmentId?: string
  authorId?: string
  authorName?: string
  type: RecordType
  recordedAt: Date
  title: string
  description?: string
  weightKg?: number
  temperatureC?: number
  createdAt: Date
  updatedAt: Date
}

const medicalRecordSchema = new Schema<MedicalRecordDoc>(
  {
    _id: uuidId,
    patientId: { type: String, required: true },
    appointmentId: { type: String, index: true },
    authorId: { type: String },
    authorName: { type: String, maxlength: 160 },
    type: { type: String, enum: recordTypes, default: 'EXAMINATION' },
    recordedAt: { type: Date, required: true },
    title: { type: String, required: true, maxlength: 160 },
    description: { type: String, maxlength: 20000 },
    weightKg: { type: Number },
    temperatureC: { type: Number },
  },
  { timestamps: true, versionKey: false },
)
medicalRecordSchema.index({ patientId: 1, recordedAt: -1 })

export const MedicalRecord = model<MedicalRecordDoc>(
  'MedicalRecord',
  medicalRecordSchema,
  'medical_records',
)

export interface AttachmentDoc {
  _id: string
  patientId: string
  /** Appointment id (scheduling-service), when the file relates to one. */
  appointmentId?: string
  uploadedById?: string
  uploadedByName?: string
  fileName: string
  contentType: string
  sizeBytes: number
  storageKey: string
  note?: string
  createdAt: Date
}

const attachmentSchema = new Schema<AttachmentDoc>(
  {
    _id: uuidId,
    patientId: { type: String, required: true },
    appointmentId: { type: String, index: true },
    uploadedById: { type: String },
    uploadedByName: { type: String, maxlength: 160 },
    fileName: { type: String, required: true, maxlength: 255 },
    contentType: { type: String, required: true, maxlength: 100 },
    sizeBytes: { type: Number, required: true },
    storageKey: { type: String, required: true, unique: true, maxlength: 500 },
    note: { type: String, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
)
attachmentSchema.index({ patientId: 1, createdAt: -1 })

export const Attachment = model<AttachmentDoc>(
  'Attachment',
  attachmentSchema,
  'attachments',
)

export function serializeOwner(owner: OwnerDoc) {
  return {
    id: owner._id,
    firstName: owner.firstName,
    lastName: owner.lastName,
    email: owner.email ?? null,
    phone: owner.phone,
    address: owner.address ?? null,
    createdAt: owner.createdAt,
    updatedAt: owner.updatedAt,
  }
}

export function serializePatient(patient: PatientDoc) {
  return {
    id: patient._id,
    ownerId: patient.ownerId,
    name: patient.name,
    species: patient.species,
    breed: patient.breed ?? null,
    sex: patient.sex,
    isNeutered: patient.isNeutered,
    dateOfBirth: patient.dateOfBirth ?? null,
    color: patient.color ?? null,
    microchip: patient.microchip ?? null,
    responsibleVetId: patient.responsibleVetId ?? null,
    createdAt: patient.createdAt,
    updatedAt: patient.updatedAt,
  }
}

export type SerializedPatient = ReturnType<typeof serializePatient>
