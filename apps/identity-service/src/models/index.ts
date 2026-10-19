import { Schema, model } from 'mongoose'
import { uuidId } from '../lib/db.js'
import type { ClinicRole } from '../lib/permissions.js'

export interface UserDoc {
  _id: string
  /** Encrypted (AES-256-GCM); read through decryptUser(). */
  name: string
  /** Encrypted (AES-256-GCM); read through decryptUser(). */
  email: string
  /** Keyed fingerprint of the normalized email, used to find users by email. */
  emailHash: string
  /** bcrypt hash; the password itself is never stored. */
  passwordHash: string
  role: ClinicRole
  /** Lets an admin also be chosen as a patient's responsible vet. */
  isVeterinarian: boolean
  isActive: boolean
  /** Bumped on password changes so older sessions stop working. */
  sessionVersion: number
  /** Wrong passwords in a row; the account locks for a while at the limit. */
  failedLoginCount: number
  lockedUntil?: Date
  createdAt: Date
  updatedAt: Date
}

const userSchema = new Schema<UserDoc>(
  {
    _id: uuidId,
    name: { type: String, required: true },
    email: { type: String, required: true },
    emailHash: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ['ADMIN', 'VETERINARIAN', 'STAFF'],
      default: 'STAFF',
    },
    isVeterinarian: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    sessionVersion: { type: Number, default: 0 },
    failedLoginCount: { type: Number, default: 0 },
    lockedUntil: { type: Date },
  },
  { timestamps: true, versionKey: false },
)

export const User = model<UserDoc>('User', userSchema, 'users')

export interface ClinicSettingsDoc {
  _id: number
  name: string
  updatedAt: Date
}

const clinicSettingsSchema = new Schema<ClinicSettingsDoc>(
  {
    _id: { type: Number, default: 1 },
    name: { type: String, required: true, maxlength: 160 },
  },
  { timestamps: { createdAt: false, updatedAt: true }, versionKey: false },
)

export const ClinicSettings = model<ClinicSettingsDoc>(
  'ClinicSettings',
  clinicSettingsSchema,
  'clinic_settings',
)
