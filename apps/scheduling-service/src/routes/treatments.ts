import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import {
  CLOSES_AT,
  OPENS_AT,
  formatClock,
  isOnWorkingDay,
  isWithinOpeningHours,
  scheduleRules,
} from '../lib/clinicHours.js'
import { fetchPatient } from '../lib/clinic.js'
import { requireEditor } from '../lib/requester.js'
import { planSeries } from '../lib/series.js'
import {
  Appointment,
  Treatment,
  intervalUnits,
  serializeAppointment,
  serializeTreatment,
  type TreatmentDoc,
} from '../models/index.js'

interface TreatmentBody {
  name: string
  description?: string
  intervalValue: number
  intervalUnit: TreatmentDoc['intervalUnit']
  steps: { name: string; description?: string }[]
}

interface ScheduleBody {
  startsAt: string
  durationMinutes?: number
  patientId?: string
  details?: string
}

const idParams = {
  type: 'object',
  required: ['treatmentId'],
  properties: { treatmentId: { type: 'string', minLength: 36, maxLength: 36 } },
}

const treatmentBodySchema = {
  type: 'object',
  required: ['name', 'intervalValue', 'intervalUnit', 'steps'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', maxLength: 2000 },
    intervalValue: { type: 'integer', minimum: 1, maximum: 365 },
    intervalUnit: { type: 'string', enum: intervalUnits },
    steps: {
      type: 'array',
      minItems: 1,
      maxItems: 52,
      items: {
        type: 'object',
        required: ['name'],
        additionalProperties: false,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 120 },
          description: { type: 'string', maxLength: 2000 },
        },
      },
    },
  },
}

function cleanTreatment(body: TreatmentBody) {
  const description = body.description?.trim()
  return {
    name: body.name.trim(),
    ...(description ? { description } : {}),
    intervalValue: body.intervalValue,
    intervalUnit: body.intervalUnit,
    steps: body.steps.map((step) => {
      const stepDescription = step.description?.trim()
      return {
        name: step.name.trim(),
        ...(stepDescription ? { description: stepDescription } : {}),
      }
    }),
  }
}

/** Checks the first appointment's time; replies with 400 and returns false if invalid. */
function validateFirstStart(startsAt: Date, durationMinutes: number, reply: FastifyReply) {
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60_000) {
    void reply.status(400).send({ message: 'Choose a date and time in the future.' })
    return false
  }
  if (!isOnWorkingDay(startsAt)) {
    void reply
      .status(400)
      .send({ message: 'The clinic is closed on Saturdays and Sundays. Choose a weekday.' })
    return false
  }
  if (!isWithinOpeningHours(startsAt, durationMinutes)) {
    void reply.status(400).send({
      message: `Treatment appointments must be between ${formatClock(OPENS_AT)} and ${formatClock(CLOSES_AT)}, finishing by closing time.`,
    })
    return false
  }
  return true
}

const scheduleBodySchema = {
  type: 'object',
  required: ['startsAt'],
  additionalProperties: false,
  properties: {
    startsAt: { type: 'string', format: 'date-time' },
    durationMinutes: { type: 'integer', minimum: 5, maximum: 480 },
    patientId: { type: 'string', minLength: 36, maxLength: 36 },
    details: { type: 'string', maxLength: 5000 },
  },
}

export const treatmentRoutes: FastifyPluginAsync = async (app) => {
  /** Opening hours and days, so the web app can block closed times. */
  app.get('/schedule-rules', async () => scheduleRules())

  app.get('/treatments', async () => {
    const treatments = await Treatment.find().sort({ name: 1 }).lean()
    return treatments.map(serializeTreatment)
  })

  app.get<{ Params: { treatmentId: string } }>(
    '/treatments/:treatmentId',
    { schema: { params: idParams } },
    async (request, reply) => {
      const treatment = await Treatment.findById(request.params.treatmentId).lean()
      if (!treatment) return reply.status(404).send({ message: 'Treatment not found' })
      return serializeTreatment(treatment)
    },
  )

  app.post<{ Body: TreatmentBody }>(
    '/treatments',
    { schema: { body: treatmentBodySchema } },
    async (request, reply) => {
      if (!requireEditor(request, reply)) return
      const treatment = await Treatment.create(cleanTreatment(request.body))
      return reply.status(201).send(serializeTreatment(treatment.toObject()))
    },
  )

  app.put<{ Params: { treatmentId: string }; Body: TreatmentBody }>(
    '/treatments/:treatmentId',
    { schema: { params: idParams, body: treatmentBodySchema } },
    async (request, reply) => {
      if (!requireEditor(request, reply)) return
      const values = cleanTreatment(request.body)
      const treatment = await Treatment.findByIdAndUpdate(
        request.params.treatmentId,
        {
          $set: values,
          ...(values.description === undefined && { $unset: { description: '' } }),
        },
        { new: true, runValidators: true },
      ).lean()
      if (!treatment) return reply.status(404).send({ message: 'Treatment not found' })
      return serializeTreatment(treatment)
    },
  )

  app.delete<{ Params: { treatmentId: string } }>(
    '/treatments/:treatmentId',
    { schema: { params: idParams } },
    async (request, reply) => {
      if (!requireEditor(request, reply)) return
      // Appointments already booked keep their copy of the treatment's name.
      const { deletedCount } = await Treatment.deleteOne({ _id: request.params.treatmentId })
      if (deletedCount === 0) return reply.status(404).send({ message: 'Treatment not found' })
      return reply.status(204).send()
    },
  )

  /** The dates a treatment course would be booked on, without saving anything. */
  app.post<{ Params: { treatmentId: string }; Body: ScheduleBody }>(
    '/treatments/:treatmentId/preview',
    { schema: { params: idParams, body: scheduleBodySchema } },
    async (request, reply) => {
      const treatment = await Treatment.findById(request.params.treatmentId).lean()
      if (!treatment) return reply.status(404).send({ message: 'Treatment not found' })

      const startsAt = new Date(request.body.startsAt)
      const durationMinutes = request.body.durationMinutes ?? 30
      if (!validateFirstStart(startsAt, durationMinutes, reply)) return

      const plan = await planSeries(treatment, startsAt, durationMinutes)
      return { treatment: serializeTreatment(treatment), appointments: plan }
    },
  )

  /** Books every appointment of a treatment course for a patient. */
  app.post<{ Params: { treatmentId: string }; Body: ScheduleBody }>(
    '/treatments/:treatmentId/book',
    { schema: { params: idParams, body: { ...scheduleBodySchema, required: ['startsAt', 'patientId'] } } },
    async (request, reply) => {
      const treatment = await Treatment.findById(request.params.treatmentId).lean()
      if (!treatment) return reply.status(404).send({ message: 'Treatment not found' })

      const startsAt = new Date(request.body.startsAt)
      const durationMinutes = request.body.durationMinutes ?? 30
      if (!validateFirstStart(startsAt, durationMinutes, reply)) return

      const lookup = await fetchPatient(request.body.patientId ?? '')
      if ('missing' in lookup) return reply.status(400).send({ message: 'Patient does not exist' })
      if ('failedStatus' in lookup) {
        request.log.error({ statusCode: lookup.failedStatus }, 'Unable to verify patient')
        return reply.status(502).send({ message: 'Unable to verify patient' })
      }
      const { patient } = lookup

      const plan = await planSeries(treatment, startsAt, durationMinutes)
      const seriesId = randomUUID()
      const notes = request.body.details?.trim()
      const created = await Appointment.insertMany(
        plan.map((item) => {
          const details = [item.description, item.stepNumber === 1 ? notes : undefined]
            .filter(Boolean)
            .join('\n\n')
          return {
            patientId: patient.id,
            patientName: patient.name,
            ownerId: patient.ownerId,
            title: `${treatment.name}: ${item.name}`.slice(0, 160),
            ...(details && { details }),
            startsAt: item.startsAt,
            durationMinutes,
            category: 'TREATMENT' as const,
            treatmentId: treatment._id,
            treatmentName: treatment.name,
            seriesId,
            stepNumber: item.stepNumber,
            stepCount: plan.length,
          }
        }),
      )

      return reply.status(201).send({
        seriesId,
        appointments: created
          .map((appointment) => serializeAppointment(appointment.toObject()))
          .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
      })
    },
  )
}
