import { randomUUID } from 'node:crypto'
import type { FastifyPluginAsync, FastifyReply } from 'fastify'
import {
  formatClock,
  isWithinOpeningHours,
  scheduleRules,
  toClinicTime,
  weekday,
} from '../lib/clinicHours.js'
import { getWeeklyHours } from '../lib/weeklyHours.js'
import { closureOn, describeClosure } from '../lib/closedDays.js'
import { fetchPatient } from '../lib/clinic.js'
import { requireEditor } from '../lib/requester.js'
import { planSeries } from '../lib/series.js'
import {
  Appointment,
  Treatment,
  intervalUnits,
  serializeAppointment,
  serializeTreatment,
  type IntervalUnit,
} from '../models/index.js'

interface TreatmentBody {
  name: string
  description?: string
  steps: { name: string; description?: string; gapValue?: number; gapUnit?: IntervalUnit }[]
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
  required: ['name', 'steps'],
  additionalProperties: false,
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 120 },
    description: { type: 'string', maxLength: 2000 },
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
          // Days or weeks after the previous appointment (all but the first).
          gapValue: { type: 'integer', minimum: 1, maximum: 365 },
          gapUnit: { type: 'string', enum: intervalUnits },
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
    steps: body.steps.map((step, index) => {
      const stepDescription = step.description?.trim()
      return {
        name: step.name.trim(),
        ...(stepDescription ? { description: stepDescription } : {}),
        ...(index > 0 && { gapValue: step.gapValue ?? 1, gapUnit: step.gapUnit ?? 'WEEKS' }),
      }
    }),
  }
}

/** Every appointment after the first needs its gap; replies 400 if one is missing. */
function hasAllGaps(body: TreatmentBody, reply: FastifyReply) {
  const missing = body.steps.findIndex(
    (step, index) => index > 0 && (step.gapValue === undefined || step.gapUnit === undefined),
  )
  if (missing === -1) return true
  void reply.status(400).send({
    message: `Say how long after the previous appointment appointment ${missing + 1} is.`,
  })
  return false
}

/** Checks the first appointment's time; replies with 400 and returns false if invalid. */
async function validateFirstStart(startsAt: Date, durationMinutes: number, reply: FastifyReply) {
  if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now() - 60_000) {
    void reply
      .status(400)
      .send({ message: 'A treatment course must start at a date and time in the future.' })
    return false
  }
  const closure = await closureOn(startsAt)
  if (closure) {
    void reply.status(400).send({
      message: `${describeClosure(closure)}. A treatment course must start on a day the clinic is open.`,
    })
    return false
  }
  const hours = await getWeeklyHours()
  if (!isWithinOpeningHours(startsAt, durationMinutes, hours)) {
    const today = hours[weekday(toClinicTime(startsAt).day)]!
    void reply.status(400).send({
      message: `On that day the clinic is open ${formatClock(today.opensAt)}–${formatClock(today.closesAt)}. Treatment appointments must fit inside opening hours.`,
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
  app.get('/schedule-rules', async () => scheduleRules(await getWeeklyHours()))

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
      if (!hasAllGaps(request.body, reply)) return
      const treatment = await Treatment.create(cleanTreatment(request.body))
      return reply.status(201).send(serializeTreatment(treatment.toObject()))
    },
  )

  app.put<{ Params: { treatmentId: string }; Body: TreatmentBody }>(
    '/treatments/:treatmentId',
    { schema: { params: idParams, body: treatmentBodySchema } },
    async (request, reply) => {
      if (!requireEditor(request, reply)) return
      if (!hasAllGaps(request.body, reply)) return
      const values = cleanTreatment(request.body)
      const treatment = await Treatment.findByIdAndUpdate(
        request.params.treatmentId,
        {
          $set: values,
          // The per-appointment gaps replace any old single interval.
          $unset: {
            intervalValue: '',
            intervalUnit: '',
            ...(values.description === undefined && { description: '' }),
          },
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
      if (!(await validateFirstStart(startsAt, durationMinutes, reply))) return

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
      if (!(await validateFirstStart(startsAt, durationMinutes, reply))) return

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
