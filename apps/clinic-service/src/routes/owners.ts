import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'

interface CreateOwnerBody {
  firstName: string
  lastName: string
  email?: string
  phone: string
  address?: string
}

export const ownerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/owners', async () => {
    return prisma.owner.findMany({
      include: {
        pets: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    })
  })

  app.post<{ Body: CreateOwnerBody }>(
    '/owners',
    {
      schema: {
        body: {
          type: 'object',
          required: ['firstName', 'lastName', 'phone'],
          additionalProperties: false,
          properties: {
            firstName: { type: 'string', minLength: 1, maxLength: 100 },
            lastName: { type: 'string', minLength: 1, maxLength: 100 },
            email: { type: 'string', format: 'email', maxLength: 255 },
            phone: { type: 'string', minLength: 1, maxLength: 30 },
            address: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const owner = await prisma.owner.create({
        data: request.body,
      })

      return reply.status(201).send(owner)
    },
  )
}