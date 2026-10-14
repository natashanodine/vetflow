import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '../generated/prisma/client.js'
import { prisma } from '../lib/prisma.js'

interface CreateOwnerBody {
  firstName: string
  lastName: string
  email?: string
  phone: string
  address?: string
}

interface OwnerParams {
  ownerId: string
}

export const ownerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/owners', async () => {
    return prisma.owner.findMany({
      include: {
        patients: true,
      },
      orderBy: {
        lastName: 'asc',
      },
    })
  })

  app.get<{ Params: OwnerParams }>(
    '/owners/:ownerId',
    async (request, reply) => {
      const owner = await prisma.owner.findUnique({
        where: {
          id: request.params.ownerId,
        },
        include: {
          patients: true,
        },
      })

      if (!owner) {
        return reply.status(404).send({ message: 'Owner not found' })
      }

      return owner
    },
  )

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
      try {
        const owner = await prisma.owner.create({
          data: request.body,
        })

        return reply.status(201).send(owner)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.status(409).send({
            message:
              'An owner with this email already exists. Select the existing owner instead.',
          })
        }

        throw error
      }
    },
  )
}
