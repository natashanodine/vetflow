import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'

type Species =
  | 'DOG'
  | 'CAT'
  | 'HORSE'
  | 'BIRD'
  | 'RABBIT'
  | 'REPTILE'
  | 'OTHER'

type Sex = 'MALE' | 'FEMALE' | 'UNKNOWN'

interface OwnerParams {
  ownerId: string
}

interface PetParams {
  petId: string
}

interface CreatePetBody {
  name: string
  species: Species
  breed?: string
  sex?: Sex
  dateOfBirth?: string
  color?: string
  microchip?: string
}

export const petRoutes: FastifyPluginAsync = async (app) => {
  app.get('/pets', async () => {
    return prisma.pet.findMany({
      include: {
        owner: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  })

  app.get<{ Params: PetParams }>(
    '/pets/:petId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['petId'],
          properties: {
            petId: {
              type: 'string',
              minLength: 36,
              maxLength: 36,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const pet = await prisma.pet.findUnique({
        where: {
          id: request.params.petId,
        },
        include: {
          owner: true,
        },
      })

      if (!pet) {
        return reply.status(404).send({
          message: 'Pet not found',
        })
      }

      return pet
    },
  )

  app.post<{ Params: OwnerParams; Body: CreatePetBody }>(
    '/owners/:ownerId/pets',
    {
      schema: {
        params: {
          type: 'object',
          required: ['ownerId'],
          properties: {
            ownerId: {
              type: 'string',
              minLength: 36,
              maxLength: 36,
            },
          },
        },
        body: {
          type: 'object',
          required: ['name', 'species'],
          additionalProperties: false,
          properties: {
            name: {
              type: 'string',
              minLength: 1,
              maxLength: 100,
            },
            species: {
              type: 'string',
              enum: ['DOG', 'CAT', 'HORSE', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER'],
            },
            breed: {
              type: 'string',
              maxLength: 100,
            },
            sex: {
              type: 'string',
              enum: ['MALE', 'FEMALE', 'UNKNOWN'],
            },
            dateOfBirth: {
              type: 'string',
              format: 'date',
            },
            color: {
              type: 'string',
              maxLength: 100,
            },
            microchip: {
              type: 'string',
              maxLength: 100,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { ownerId } = request.params
      const body = request.body

      const owner = await prisma.owner.findUnique({
        where: {
          id: ownerId,
        },
        select: {
          id: true,
        },
      })

      if (!owner) {
        return reply.status(404).send({
          message: 'Owner not found',
        })
      }

      const pet = await prisma.pet.create({
        data: {
          ownerId,
          name: body.name,
          species: body.species,
          sex: body.sex ?? 'UNKNOWN',
          ...(body.breed !== undefined && {
            breed: body.breed,
          }),
          ...(body.dateOfBirth !== undefined && {
            dateOfBirth: new Date(`${body.dateOfBirth}T00:00:00.000Z`),
          }),
          ...(body.color !== undefined && {
            color: body.color,
          }),
          ...(body.microchip !== undefined && {
            microchip: body.microchip,
          }),
        },
        include: {
          owner: true,
        },
      })

      return reply.status(201).send(pet)
    },
  )
}