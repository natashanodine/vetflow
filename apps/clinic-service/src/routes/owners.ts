import type { FastifyPluginAsync } from 'fastify'
import { isDuplicateKeyError, toUpdate, withoutEmpty } from '../lib/db.js'
import {
  Owner,
  Patient,
  serializeOwner,
  serializePatient,
  type OwnerDoc,
} from '../models/index.js'
import { requireRequester } from '../lib/requester.js'

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

interface UpdateOwnerBody {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  address?: string
}

/** Owners with their patients, as the API returns them. */
async function withPatients(owners: OwnerDoc[]) {
  const patients = await Patient.find({
    ownerId: { $in: owners.map((owner) => owner._id) },
  })
    .sort({ createdAt: 1 })
    .lean()

  return owners.map((owner) => ({
    ...serializeOwner(owner),
    patients: patients
      .filter((patient) => patient.ownerId === owner._id)
      .map(serializePatient),
  }))
}

export const ownerRoutes: FastifyPluginAsync = async (app) => {
  app.get('/owners', async () => {
    const owners = await Owner.find().sort({ lastName: 1, firstName: 1 }).lean()
    return withPatients(owners)
  })

  app.get<{ Params: OwnerParams }>(
    '/owners/:ownerId',
    async (request, reply) => {
      const owner = await Owner.findById(request.params.ownerId).lean()

      if (!owner) {
        return reply.status(404).send({ message: 'Owner not found' })
      }

      const [result] = await withPatients([owner])
      return result
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
        const owner = await Owner.create(withoutEmpty(request.body))

        return reply.status(201).send(serializeOwner(owner.toObject()))
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return reply.status(409).send({
            message:
              'An owner with this email already exists. Select the existing owner instead.',
          })
        }

        throw error
      }
    },
  )

  app.patch<{ Params: OwnerParams; Body: UpdateOwnerBody }>(
    '/owners/:ownerId',
    {
      schema: {
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            firstName: { type: 'string', minLength: 1, maxLength: 100 },
            lastName: { type: 'string', minLength: 1, maxLength: 100 },
            // An empty string clears the field.
            email: {
              anyOf: [
                { type: 'string', format: 'email', maxLength: 255 },
                { type: 'string', maxLength: 0 },
              ],
            },
            phone: { type: 'string', minLength: 1, maxLength: 30 },
            address: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireRequester(request, reply, 'editRecords')) return

      const body = request.body
      try {
        const owner = await Owner.findByIdAndUpdate(
          request.params.ownerId,
          toUpdate({
            firstName: body.firstName?.trim(),
            lastName: body.lastName?.trim(),
            phone: body.phone?.trim(),
            email: body.email === undefined ? undefined : body.email.trim() || null,
            address:
              body.address === undefined ? undefined : body.address.trim() || null,
          }),
          { new: true, runValidators: true },
        ).lean()
        if (!owner) return reply.status(404).send({ message: 'Owner not found' })

        const [result] = await withPatients([owner])
        return result
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          return reply
            .status(409)
            .send({ message: 'Another owner already uses this email.' })
        }
        throw error
      }
    },
  )
}
