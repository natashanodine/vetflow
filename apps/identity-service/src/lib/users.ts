import { ClinicSettings, User, type UserDoc } from '../models/index.js'

export function isVet(user: Pick<UserDoc, 'role' | 'isVeterinarian'>) {
  // The Veterinarian role always counts as a vet.
  return user.role === 'VETERINARIAN' || user.isVeterinarian
}

export function serializeTeamMember(user: UserDoc) {
  return {
    userId: user._id,
    name: user.name,
    email: user.email,
    isActive: user.isActive,
    role: user.role,
    isVeterinarian: isVet(user),
    addedAt: user.createdAt,
  }
}

const roleOrder = { ADMIN: 0, VETERINARIAN: 1, STAFF: 2 }

/** Admins first, then vets, then staff; alphabetical within each. */
export function byRoleThenName(a: UserDoc, b: UserDoc) {
  return roleOrder[a.role] - roleOrder[b.role] || a.name.localeCompare(b.name)
}

/** Number of active admins, optionally ignoring one user. */
export function countActiveAdmins(excludingUserId?: string) {
  return User.countDocuments({
    role: 'ADMIN',
    isActive: true,
    ...(excludingUserId !== undefined && { _id: { $ne: excludingUserId } }),
  })
}

export async function getClinicName() {
  const settings = await ClinicSettings.findById(1).lean()
  return settings?.name ?? 'Equora'
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}
