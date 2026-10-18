import type { FastifyPluginAsync } from 'fastify'
import { toUpdate, withoutEmpty } from '../lib/db.js'
import { patientExists } from '../lib/patients.js'
import {
  MedicalRecord,
  recordTypes,
  type MedicalRecordDoc,
  type RecordType,
} from '../models/index.js'
import { requireRequester } from '../lib/requester.js'
import { getAppointment } from '../lib/services.js'

interface RecordBody {
  type?: RecordType
  recordedAt?: string
  title?: string
  description?: string | null
  weightKg?: number | null
  temperatureC?: number | null
  appointmentId?: string | null
}

const idSchema = { type: 'string', minLength: 36, maxLength: 36 }
const recordProperties = {
  type: { type: 'string', enum: recordTypes },
  recordedAt: { type: 'string', format: 'date' },
  title: { type: 'string', minLength: 1, maxLength: 160 },
  description: { anyOf: [{ type: 'string', maxLength: 20000 }, { type: 'null' }] },
  weightKg: {
    anyOf: [{ type: 'number', exclusiveMinimum: 0, maximum: 99999 }, { type: 'null' }],
  },
  temperatureC: {
    anyOf: [{ type: 'number', minimum: 20, maximum: 50 }, { type: 'null' }],
  },
  appointmentId: { anyOf: [idSchema, { type: 'null' }] },
}

function serialize(record: MedicalRecordDoc) {
  return {
    id: record._id,
    patientId: record.patientId,
    appointmentId: record.appointmentId ?? null,
    type: record.type,
    recordedAt: record.recordedAt.toISOString().slice(0, 10),
    title: record.title,
    description: record.description ?? null,
    weightKg: record.weightKg ?? null,
    temperatureC: record.temperatureC ?? null,
    authorName: record.authorName ?? null,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

function toDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function isFutureDate(value: string) {
  // Allow "today" in any time zone by comparing against tomorrow (UTC).
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  return toDate(value) > tomorrow
}

async function appointmentMatches(appointmentId: string, patientId: string) {
  const appointment = await getAppointment(appointmentId)
  return appointment?.patientId === patientId
}

export const recordRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/records',
    { schema: { params: { type: 'object', properties: { patientId: idSchema } } } },
    async (request, reply) => {
      if (!requireRequester(request, reply)) return

      const { patientId } = request.params
      if (!(await patientExists(patientId))) {
        return reply.status(404).send({ message: 'Patient not found' })
      }

      const records = await MedicalRecord.find({ patientId })
        .sort({ recordedAt: -1, createdAt: -1 })
        .lean()
      return records.map(serialize)
    },
  )

  app.post<{ Params: { patientId: string }; Body: Required<Pick<RecordBody, 'type' | 'recordedAt' | 'title'>> & RecordBody }>(
    '/patients/:patientId/records',
    {
      schema: {
        params: { type: 'object', properties: { patientId: idSchema } },
        body: {
          type: 'object',
          required: ['type', 'recordedAt', 'title'],
          additionalProperties: false,
          properties: recordProperties,
        },
      },
    },
    async (request, reply) => {
      const requester = requireRequester(request, reply, 'editRecords')
      if (!requester) return

      const { patientId } = request.params
      if (!(await patientExists(patientId))) {
        return reply.status(404).send({ message: 'Patient not found' })
      }

      const body = request.body
      if (isFutureDate(body.recordedAt)) {
        return reply
          .status(400)
          .send({ message: 'Medical history entries cannot be dated in the future.' })
      }
      if (body.appointmentId && !(await appointmentMatches(body.appointmentId, patientId))) {
        return reply
          .status(400)
          .send({ message: 'That appointment does not belong to this patient.' })
      }

      const record = await MedicalRecord.create(
        withoutEmpty({
          patientId,
          type: body.type,
          recordedAt: toDate(body.recordedAt),
          title: body.title.trim(),
          description: body.description?.trim() || null,
          weightKg: body.weightKg ?? null,
          temperatureC: body.temperatureC ?? null,
          appointmentId: body.appointmentId ?? null,
          authorId: requester.userId,
          authorName: requester.name || null,
        }),
      )
      return reply.status(201).send(serialize(record.toObject()))
    },
  )

  app.patch<{ Params: { recordId: string }; Body: RecordBody }>(
    '/records/:recordId',
    {
      schema: {
        params: { type: 'object', properties: { recordId: idSchema } },
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: recordProperties,
        },
      },
    },
    async (request, reply) => {
      if (!requireRequester(request, reply, 'editRecords')) return

      const existing = await MedicalRecord.findById(request.params.recordId).lean()
      if (!existing) return reply.status(404).send({ message: 'Record not found' })

      const body = request.body
      if (body.recordedAt && isFutureDate(body.recordedAt)) {
        return reply
          .status(400)
          .send({ message: 'Medical history entries cannot be dated in the future.' })
      }
      if (
        body.appointmentId &&
        body.appointmentId !== existing.appointmentId &&
        !(await appointmentMatches(body.appointmentId, existing.patientId))
      ) {
        return reply
          .status(400)
          .send({ message: 'That appointment does not belong to this patient.' })
      }

      const record = await MedicalRecord.findByIdAndUpdate(
        existing._id,
        toUpdate({
          type: body.type,
          recordedAt:
            body.recordedAt === undefined ? undefined : toDate(body.recordedAt),
          title: body.title?.trim(),
          description:
            body.description === undefined
              ? undefined
              : body.description?.trim() || null,
          weightKg: body.weightKg,
          temperatureC: body.temperatureC,
          appointmentId: body.appointmentId,
        }),
        { new: true, runValidators: true },
      ).lean()
      if (!record) return reply.status(404).send({ message: 'Record not found' })
      return serialize(record)
    },
  )

  app.delete<{ Params: { recordId: string } }>(
    '/records/:recordId',
    async (request, reply) => {
      if (!requireRequester(request, reply, 'editRecords')) return

      const { deletedCount } = await MedicalRecord.deleteOne({
        _id: request.params.recordId,
      })
      if (deletedCount === 0) {
        return reply.status(404).send({ message: 'Record not found' })
      }
      return reply.status(204).send()
    },
  )
}
