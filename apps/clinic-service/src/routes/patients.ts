import type { FastifyPluginAsync } from 'fastify'
import { isDuplicateKeyError, toUpdate, withoutEmpty } from '../lib/db.js'
import { presentPatient, presentPatients } from '../lib/patients.js'
import { Owner, Patient } from '../models/index.js'
import { requireRequester } from '../lib/requester.js'
import { isAssignableVet, syncPatientToScheduling } from '../lib/services.js'

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
  weightKg?: number
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

interface UpdatePatientBody {
  ownerId?: string
  name?: string
  species?: Species
  breed?: string
  weightKg?: number | null
  sex?: Sex
  isNeutered?: boolean
  /** Empty string clears it */
  dateOfBirth?: string
  color?: string
  microchip?: string
  responsibleVetId?: string | null
}

interface CreateOwnerAndPatientBody {
  owner: CreateOwnerBody
  patient: CreatePatientBody
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

export const patientRoutes: FastifyPluginAsync = async (app) => {
  app.get('/patients', async () => {
    const patients = await Patient.find().sort({ name: 1 }).lean()
    return presentPatients(patients)
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
      const patient = await Patient.findById(request.params.patientId).lean()

      if (!patient) {
        return reply.status(404).send({
          message: 'Patient not found',
        })
      }

      return presentPatient(patient)
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
            weightKg: { type: 'number', minimum: 0, maximum: 2000 },
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

      const owner = await Owner.exists({ _id: ownerId })

      if (!owner) {
        return reply.status(404).send({
          message: 'Owner not found',
        })
      }

      try {
        const patient = await Patient.create(
          withoutEmpty({
            ownerId: ownerId,
            name: body.name,
            species: body.species,
            sex: body.sex ?? 'UNKNOWN',
            isNeutered: body.isNeutered ?? false,
            breed: body.breed,
            weightKg: body.weightKg ?? null,
            dateOfBirth:
              body.dateOfBirth === undefined ? undefined : toDate(body.dateOfBirth),
            color: body.color,
            microchip: body.microchip || undefined,
          }),
        )
        return reply.status(201).send(await presentPatient(patient.toObject()))
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return reply
            .status(409)
            .send({ message: 'Another patient already uses this microchip.' })
        }
        throw error
      }
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
                weightKg: { type: 'number', minimum: 0, maximum: 2000 },
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
        // Check the microchip first so a duplicate doesn't leave a new owner
        // behind without a patient.
        if (
          patientBody.microchip &&
          (await Patient.exists({ microchip: patientBody.microchip }))
        ) {
          return reply
            .status(409)
            .send({ message: 'Another patient already uses this microchip.' })
        }

        const owner = await Owner.create(withoutEmpty(ownerBody))
        try {
          const patient = await Patient.create(
            withoutEmpty({
              ownerId: owner._id,
              name: patientBody.name,
              species: patientBody.species,
              sex: patientBody.sex ?? 'UNKNOWN',
              isNeutered: patientBody.isNeutered ?? false,
              breed: patientBody.breed,
              weightKg: patientBody.weightKg ?? null,
              dateOfBirth:
                patientBody.dateOfBirth === undefined ? undefined : toDate(patientBody.dateOfBirth),
              color: patientBody.color,
              microchip: patientBody.microchip || undefined,
            }),
          )
          return reply.status(201).send(await presentPatient(patient.toObject()))
        } catch (error) {
          await Owner.deleteOne({ _id: owner._id }).catch(() => undefined)
          throw error
        }
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return reply.status(409).send({
            message:
              'The owner email or patient microchip is already in use.',
          })
        }

        throw error
      }
    },
  )

  app.patch<{ Params: PatientParams; Body: UpdatePatientBody }>(
    '/patients/:patientId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'string', minLength: 36, maxLength: 36 },
          },
        },
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            ownerId: { type: 'string', minLength: 36, maxLength: 36 },
            name: { type: 'string', minLength: 1, maxLength: 100 },
            species: {
              type: 'string',
              enum: ['DOG', 'CAT', 'HORSE', 'BIRD', 'RABBIT', 'REPTILE', 'OTHER'],
            },
            breed: { type: 'string', maxLength: 100 },
            weightKg: { type: ['number', 'null'], minimum: 0, maximum: 2000 },
            sex: { type: 'string', enum: ['MALE', 'FEMALE', 'UNKNOWN'] },
            isNeutered: { type: 'boolean' },
            dateOfBirth: {
              anyOf: [
                { type: 'string', format: 'date' },
                { type: 'string', maxLength: 0 },
              ],
            },
            color: { type: 'string', maxLength: 100 },
            microchip: { type: 'string', maxLength: 100 },
            responsibleVetId: {
              anyOf: [
                { type: 'string', minLength: 36, maxLength: 36 },
                { type: 'null' },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireRequester(request, reply, 'editRecords')) return

      const existing = await Patient.findById(request.params.patientId).lean()
      if (!existing) {
        return reply.status(404).send({ message: 'Patient not found' })
      }

      const body = request.body

      if (body.ownerId && body.ownerId !== existing.ownerId) {
        const owner = await Owner.exists({ _id: body.ownerId })
        if (!owner) return reply.status(400).send({ message: 'Owner not found' })
      }

      // Only check the vet when it changes, so a pet whose vet later left the
      // vet list can still have its other details edited.
      if (
        body.responsibleVetId &&
        body.responsibleVetId !== existing.responsibleVetId &&
        !(await isAssignableVet(body.responsibleVetId))
      ) {
        return reply
          .status(400)
          .send({ message: 'Choose a veterinarian from this clinic.' })
      }

      const optionalText = (value: string) => value.trim() || null

      try {
        const patient = await Patient.findByIdAndUpdate(
          existing._id,
          toUpdate({
            ownerId: body.ownerId,
            name: body.name?.trim(),
            species: body.species,
            sex: body.sex,
            isNeutered: body.isNeutered,
            breed: body.breed === undefined ? undefined : optionalText(body.breed),
            weightKg: body.weightKg,
            color: body.color === undefined ? undefined : optionalText(body.color),
            microchip:
              body.microchip === undefined ? undefined : optionalText(body.microchip),
            dateOfBirth:
              body.dateOfBirth === undefined
                ? undefined
                : body.dateOfBirth
                  ? toDate(body.dateOfBirth)
                  : null,
            responsibleVetId: body.responsibleVetId,
          }),
          { new: true, runValidators: true },
        ).lean()
        if (!patient) {
          return reply.status(404).send({ message: 'Patient not found' })
        }

        // Appointments keep a copy of the patient's name and owner.
        if (
          patient.name !== existing.name ||
          patient.ownerId !== existing.ownerId
        ) {
          await syncPatientToScheduling(patient._id, {
            patientName: patient.name,
            ownerId: patient.ownerId,
          }).catch((error: unknown) => {
            request.log.warn({ error }, 'Could not update appointments with the new patient details')
          })
        }

        return presentPatient(patient)
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return reply
            .status(409)
            .send({ message: 'Another patient already uses this microchip.' })
        }
        throw error
      }
    },
  )
}
