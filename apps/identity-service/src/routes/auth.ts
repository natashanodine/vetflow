import type { FastifyPluginAsync } from 'fastify'
import { compare, hash, hashSync } from 'bcryptjs'
import { User } from '../models/index.js'
import { requireRequester } from '../lib/requester.js'
import {
  clearedSessionCookie,
  createSessionToken,
  sessionCookie,
} from '../lib/session.js'
import { getClinicName, isVet, normalizeEmail } from '../lib/users.js'

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
      const user = await User.findOne({
        email: normalizeEmail(request.body.email),
      }).lean()
      const passwordMatches = await compare(
        request.body.password,
        user?.passwordHash ?? DUMMY_HASH,
      )

      if (!user || !passwordMatches || !user.isActive) {
        return reply
          .status(401)
          .send({ message: 'The email or password is incorrect.' })
      }

      reply.header(
        'set-cookie',
        sessionCookie(createSessionToken(user._id, user.sessionVersion)),
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

    const user = await User.findById(requester.userId).lean()
    if (!user) return reply.status(401).send({ message: 'Authentication required' })

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
        sessionCookie(createSessionToken(updated._id, updated.sessionVersion)),
      )
      return { ok: true }
    },
  )
}
