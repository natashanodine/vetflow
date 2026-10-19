import type { FastifyPluginAsync } from 'fastify'
import { ClinicSettings } from '../models/index.js'
import { requireRequester } from '../lib/requester.js'
import { getClinicName, isVet, userDirectory } from '../lib/users.js'

export const clinicRoutes: FastifyPluginAsync = async (app) => {
  app.get('/clinic', async (request, reply) => {
    if (!requireRequester(request, reply)) return
    return { name: await getClinicName() }
  })

  app.patch<{ Body: { name: string } }>(
    '/clinic',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          additionalProperties: false,
          properties: { name: { type: 'string', minLength: 1, maxLength: 160 } },
        },
      },
    },
    async (request, reply) => {
      if (!requireRequester(request, reply, 'manageTeam')) return
      const name = request.body.name.trim()
      if (!name) return reply.status(400).send({ message: 'Enter a clinic name.' })

      await ClinicSettings.updateOne(
        { _id: 1 },
        { $set: { name } },
        { upsert: true },
      )
      return { name }
    },
  )

  /** Everyone's name, so screens can show who did what. */
  app.get('/users/directory', async (request, reply) => {
    if (!requireRequester(request, reply)) return
    const users = await userDirectory()
    return users.map((user) => ({ id: user._id, name: user.name }))
  })

  /** People who can be chosen as a patient's responsible vet. */
  app.get('/vets', async (request, reply) => {
    if (!requireRequester(request, reply)) return
    const users = await userDirectory({ isActive: true })
    return users
      .filter(isVet)
      .map((user) => ({ id: user._id, name: user.name, role: user.role }))
  })
}
