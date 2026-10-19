import type { FastifyPluginAsync } from 'fastify'
import { compare, hash, hashSync } from 'bcryptjs'
import { User } from '../models/index.js'
import { requireRequester } from '../lib/requester.js'
import {
  clearedSessionCookie,
  createSessionToken,
  sessionCookie,
} from '../lib/session.js'
import { decryptUser, findUserByEmail, getClinicName, isVet } from '../lib/users.js'

interface LoginBody {
  email: string
  password: string
}

interface ChangePasswordBody {
  currentPassword: string
  newPassword: string
}

// Compared against when the email is unknown, so failed logins take the
// same time whether or not the account exists.
const DUMMY_HASH = hashSync('not-a-real-password', 12)

/** Wrong passwords in a row before the account is locked for a while. */
const MAX_FAILED_LOGINS = 10
const LOCK_MINUTES = 15

function minutesUntil(date: Date) {
  return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 60_000))
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: LoginBody }>(
    '/auth/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          additionalProperties: false,
          properties: {
            email: { type: 'string', minLength: 3, maxLength: 255 },
            password: { type: 'string', minLength: 1, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await findUserByEmail(request.body.email)
      const passwordMatches = await compare(
        request.body.password,
        user?.passwordHash ?? DUMMY_HASH,
      )

      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        return reply.status(429).send({
          message: `Too many failed sign-in attempts. Try again in ${minutesUntil(user.lockedUntil)} minute(s).`,
        })
      }

      if (user && !passwordMatches) {
        // Count wrong passwords; at the limit, lock the account for a while.
        const updated = await User.findByIdAndUpdate(
          user._id,
          { $inc: { failedLoginCount: 1 } },
          { new: true },
        ).lean()
        if (updated && updated.failedLoginCount >= MAX_FAILED_LOGINS) {
          const lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000)
          await User.updateOne({ _id: user._id }, { $set: { lockedUntil, failedLoginCount: 0 } })
          request.log.warn({ userId: user._id }, 'Account locked after repeated failed sign-ins')
          return reply.status(429).send({
            message: `Too many failed sign-in attempts. Try again in ${LOCK_MINUTES} minutes.`,
          })
        }
      }

      if (!user || !passwordMatches || !user.isActive) {
        return reply
          .status(401)
          .send({ message: 'The email or password is incorrect.' })
      }

      if (user.failedLoginCount > 0 || user.lockedUntil) {
        await User.updateOne(
          { _id: user._id },
          { $set: { failedLoginCount: 0 }, $unset: { lockedUntil: '' } },
        )
      }

      reply.header(
        'set-cookie',
        sessionCookie(await createSessionToken(user._id, user.sessionVersion)),
      )
      return { ok: true }
    },
  )

  app.post('/auth/logout', async (_request, reply) => {
    reply.header('set-cookie', clearedSessionCookie())
    return { ok: true }
  })

  app.get('/auth/me', async (request, reply) => {
    const requester = requireRequester(request, reply)
    if (!requester) return

    const stored = await User.findById(requester.userId).lean()
    if (!stored) return reply.status(401).send({ message: 'Authentication required' })
    const user = decryptUser(stored)

    return {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVeterinarian: isVet(user),
      },
      clinic: { name: await getClinicName() },
    }
  })

  app.post<{ Body: ChangePasswordBody }>(
    '/auth/change-password',
    {
      schema: {
        body: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          additionalProperties: false,
          properties: {
            currentPassword: { type: 'string', maxLength: 128 },
            newPassword: { type: 'string', minLength: 12, maxLength: 128 },
          },
        },
      },
    },
    async (request, reply) => {
      const requester = requireRequester(request, reply)
      if (!requester) return

      const { currentPassword, newPassword } = request.body
      if (currentPassword === newPassword) {
        return reply.status(400).send({
          message: 'Choose a password different from your current one.',
        })
      }

      const user = await User.findById(requester.userId).lean()
      if (!user || !(await compare(currentPassword, user.passwordHash))) {
        return reply
          .status(400)
          .send({ message: 'Your current password is incorrect.' })
      }

      const updated = await User.findByIdAndUpdate(
        user._id,
        {
          $set: { passwordHash: await hash(newPassword, 12) },
          // Signs out every other device that used the old password.
          $inc: { sessionVersion: 1 },
        },
        { new: true },
      ).lean()
      if (!updated) return reply.status(401).send({ message: 'Authentication required' })

      // Give this device a fresh session so it stays signed in.
      reply.header(
        'set-cookie',
        sessionCookie(await createSessionToken(updated._id, updated.sessionVersion)),
      )
      return { ok: true }
    },
  )
}
