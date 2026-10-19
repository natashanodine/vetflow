/**
 * Creates an admin, or resets an existing user's password and makes them an
 * active admin. Usage (from the repo root):
 *   docker compose exec identity-service node apps/identity-service/dist/scripts/create-admin.js
 * with ADMIN_EMAIL, ADMIN_PASSWORD and optionally ADMIN_NAME set.
 */
import 'dotenv/config'
import { hash } from 'bcryptjs'
import { connectDatabase, disconnectDatabase } from '../lib/db.js'
import { User } from '../models/index.js'
import { assertEncryptionConfigured, emailIndex } from '../lib/encryption.js'
import { encryptIdentity, normalizeEmail, prepareDatabase } from '../lib/users.js'

const email = process.env.ADMIN_EMAIL?.trim()
const password = process.env.ADMIN_PASSWORD
const name = process.env.ADMIN_NAME?.trim() || 'Clinic Administrator'

async function main() {
  if (!email || !password) throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD')
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must have at least 12 characters')
  }

  assertEncryptionConfigured()
  await connectDatabase()
  await prepareDatabase(console)
  const passwordHash = await hash(password, 12)
  const normalized = normalizeEmail(email)
  const existing = await User.findOneAndUpdate(
    { emailHash: emailIndex(normalized) },
    {
      $set: { passwordHash, role: 'ADMIN', isActive: true, failedLoginCount: 0 },
      $unset: { lockedUntil: '' },
      $inc: { sessionVersion: 1 },
    },
  )
  if (!existing) {
    await User.create({ ...encryptIdentity({ name, email }), passwordHash, role: 'ADMIN' })
  }
  console.log(`Admin ready: ${normalized}`)
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
  .finally(async () => {
    await disconnectDatabase()
  })
