import { ClinicSettings, User, type UserDoc } from '../models/index.js'
import { decryptText, emailIndex, encryptText, isEncrypted } from './encryption.js'

export function isVet(user: Pick<UserDoc, 'role' | 'isVeterinarian'>) {
  // The Veterinarian role always counts as a vet.
  return user.role === 'VETERINARIAN' || user.isVeterinarian
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

/** A user record with its name and email decrypted, for use in responses. */
export function decryptUser<T extends Pick<UserDoc, 'name'> & Partial<Pick<UserDoc, 'email'>>>(
  user: T,
): T {
  return {
    ...user,
    name: decryptText(user.name),
    ...(user.email !== undefined && { email: decryptText(user.email) }),
  }
}

/** Database fields for a name and/or email, encrypted and indexed. */
export function encryptIdentity(values: { name?: string; email?: string }) {
  const email = values.email === undefined ? undefined : normalizeEmail(values.email)
  return {
    ...(values.name !== undefined && { name: encryptText(values.name.trim()) }),
    ...(email !== undefined && { email: encryptText(email), emailHash: emailIndex(email) }),
  }
}

export async function findUserByEmail(email: string) {
  const user = await User.findOne({ emailHash: emailIndex(normalizeEmail(email)) }).lean()
  return user ? decryptUser(user) : null
}

/** Everyone's id and name, sorted by name. */
export async function userDirectory(filter: { isActive?: boolean } = {}) {
  const users = await User.find(filter).lean()
  return users
    .map((user) => decryptUser(user))
    .sort((a, b) => a.name.localeCompare(b.name))
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

/**
 * Encrypts names and emails saved before encryption was added, then removes
 * the old plain-email index. Safe to run on every start.
 */
export async function prepareDatabase(log: { info: (message: string) => void }) {
  const users = await User.collection
    .find({ $or: [{ emailHash: { $exists: false } }, { email: { $not: /^enc:v1:/ } }] })
    .toArray()

  for (const user of users) {
    const name = String(user.name ?? '')
    const email = String(user.email ?? '')
    const plainEmail = normalizeEmail(decryptText(email))
    await User.collection.updateOne(
      { _id: user._id },
      {
        $set: {
          name: isEncrypted(name) ? name : encryptText(name),
          email: isEncrypted(email) ? email : encryptText(plainEmail),
          emailHash: emailIndex(plainEmail),
        },
      },
    )
  }
  if (users.length > 0) log.info(`Encrypted login details for ${users.length} existing user(s)`)

  // Drops the old unique index on the plain email; adds emailHash's.
  await User.syncIndexes()
  await ClinicSettings.syncIndexes()
}
