import type { FastifyPluginAsync } from 'fastify'
import { User } from '../models/index.js'
import { verifySessionToken } from '../lib/session.js'
import { isVet } from '../lib/users.js'

/** Endpoints only for the gateway and sibling services. */
export const internalRoutes: FastifyPluginAsync = async (app) => {
  /**
   * Checks a session cookie against the live user record, so deactivation,
   * removal, role changes and password changes apply on the next request.
   */
  app.post<{ Body: { token: string } }>(
    '/internal/session',
    {
      schema: {
        body: {
          type: 'object',
          required: ['token'],
          properties: { token: { type: 'string', maxLength: 2048 } },
        },
      },
    },
    async (request, reply) => {
      const payload = verifySessionToken(request.body.token)
      if (!payload) {
        return reply.status(401).send({ reason: 'signed-out' })
      }

      const user = await User.findById(payload.sub).lean()
      if (!user || !user.isActive) {
        return reply.status(401).send({ reason: 'removed' })
      }
      if (user.sessionVersion !== payload.sv) {
        return reply.status(401).send({ reason: 'password-changed' })
      }

      return {
        id: user._id,
        name: user.name,
        role: user.role,
        isVeterinarian: isVet(user),
      }
    },
  )

  app.get<{ Params: { userId: string } }>(
    '/internal/vets/:userId',
    async (request, reply) => {
      const user = await User.findById(request.params.userId).lean()
      if (!user || !user.isActive || !isVet(user)) {
        return reply.status(404).send({ message: 'Not an active vet' })
      }
      return { id: user._id, name: user.name }
    },
  )

  app.get('/internal/users/directory', async () => {
    const users = await User.find({}, { name: 1 }).lean()
    return users.map((user) => ({ id: user._id, name: user.name }))
  })
}
