import type { FastifyBaseLogger } from 'fastify'
import { hash } from 'bcryptjs'
import { ClinicSettings, User } from '../models/index.js'
import { normalizeEmail } from './users.js'

/**
 * On a fresh install, creates the clinic settings and the first admin from
 * INITIAL_* environment variables. Does nothing once any user exists.
 */
export async function bootstrap(log: FastifyBaseLogger) {
  const clinicName = process.env.INITIAL_CLINIC_NAME?.trim() || 'Equora'
  await ClinicSettings.updateOne(
    { _id: 1 },
    { $setOnInsert: { name: clinicName } },
    { upsert: true },
  )

  if ((await User.estimatedDocumentCount()) > 0) return

  const email = process.env.INITIAL_ADMIN_EMAIL?.trim()
  const password = process.env.INITIAL_ADMIN_PASSWORD
  const name = process.env.INITIAL_ADMIN_NAME?.trim() || 'Clinic Administrator'

  if (!email || !password) {
    log.warn(
      'No users exist yet. Set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD to create the first admin.',
    )
    return
  }
  if (password.length < 12) {
    log.error('INITIAL_ADMIN_PASSWORD must have at least 12 characters.')
    return
  }

  await User.create({
    name,
    email: normalizeEmail(email),
    passwordHash: await hash(password, 12),
    role: 'ADMIN',
  })
  log.info(`Created the first admin: ${normalizeEmail(email)}`)
}
