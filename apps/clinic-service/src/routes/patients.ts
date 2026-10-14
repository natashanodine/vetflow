import type { FastifyPluginAsync } from 'fastify'
import { Prisma } from '../generated/prisma/client.js'
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

interface PatientParams {
  patientId: string
}

interface CreatePatientBody {
  name: string
  species: Species
  breed?: string
  sex?: Sex
  isNeutered?: boolean
  dateOfBirth?: string
  color?: string
  microchip?: string
}

interface CreateOwnerBody {
  firstName: string
  lastName: string
  email?: string
  phone: string
  address?: string
}

interface CreateOwnerAndPatientBody {
  owner: CreateOwnerBody
  patient: CreatePatientBody
}

export const patientRoutes: FastifyPluginAsync = async (app) => {
  app.get('/patients', async () => {
    return prisma.patient.findMany({
      include: {
        owner: true,
      },
      orderBy: {
        name: 'asc',
      },
    })
  })

  app.get<{ Params: PatientParams }>(
    '/patients/:patientId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: {
              type: 'string',
              minLength: 36,
              maxLength: 36,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const patient = await prisma.patient.findUnique({
        where: {
          id: request.params.patientId,
        },
        include: {
          owner: true,
        },
      })

      if (!patient) {
        return reply.status(404).send({
          message: 'Patient not found',
        })
      }

      return patient
    },
  )

  app.post<{ Params: OwnerParams; Body: CreatePatientBody }>(
    '/owners/:ownerId/patients',
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
            isNeutered: {
              type: 'boolean',
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

      const patient = await prisma.patient.create({
        data: {
          ownerId,
          name: body.name,
          species: body.species,
          sex: body.sex ?? 'UNKNOWN',
          isNeutered: body.isNeutered ?? false,
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

      return reply.status(201).send(patient)
    },
  )

  app.post<{ Body: CreateOwnerAndPatientBody }>(
    '/patients',
    {
      schema: {
        body: {
          type: 'object',
          required: ['owner', 'patient'],
          additionalProperties: false,
          properties: {
            owner: {
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
            patient: {
              type: 'object',
              required: ['name', 'species'],
              additionalProperties: false,
              properties: {
                name: { type: 'string', minLength: 1, maxLength: 100 },
                species: {
                  type: 'string',
                  enum: [
                    'DOG',
                    'CAT',
                    'HORSE',
                    'BIRD',
                    'RABBIT',
                    'REPTILE',
                    'OTHER',
                  ],
                },
                breed: { type: 'string', maxLength: 100 },
                sex: {
                  type: 'string',
                  enum: ['MALE', 'FEMALE', 'UNKNOWN'],
                },
                isNeutered: { type: 'boolean' },
                dateOfBirth: { type: 'string', format: 'date' },
                color: { type: 'string', maxLength: 100 },
                microchip: { type: 'string', maxLength: 100 },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { owner: ownerBody, patient: patientBody } = request.body

      try {
        const patient = await prisma.$transaction(async (transaction) => {
          const owner = await transaction.owner.create({
            data: ownerBody,
          })

          return transaction.patient.create({
            data: {
              ownerId: owner.id,
              name: patientBody.name,
              species: patientBody.species,
              sex: patientBody.sex ?? 'UNKNOWN',
              isNeutered: patientBody.isNeutered ?? false,
              ...(patientBody.breed !== undefined && {
                breed: patientBody.breed,
              }),
              ...(patientBody.dateOfBirth !== undefined && {
                dateOfBirth: new Date(
                  `${patientBody.dateOfBirth}T00:00:00.000Z`,
                ),
              }),
              ...(patientBody.color !== undefined && {
                color: patientBody.color,
              }),
              ...(patientBody.microchip !== undefined && {
                microchip: patientBody.microchip,
              }),
            },
            include: {
              owner: true,
            },
          })
        })

        return reply.status(201).send(patient)
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          return reply.status(409).send({
            message:
              'The owner email or patient microchip is already in use.',
          })
        }

        throw error
      }
    },
  )

}
