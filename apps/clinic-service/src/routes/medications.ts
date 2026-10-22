import type { FastifyPluginAsync } from 'fastify'
import { clinicToday, dateFromKey, keyFromDate } from '../lib/clinicDate.js'
import { toUpdate, withoutEmpty } from '../lib/db.js'
import { patientExists } from '../lib/patients.js'
import { requireRequester } from '../lib/requester.js'
import { getAppointment } from '../lib/services.js'
import { Medication, Patient, type MedicationDoc } from '../models/index.js'

interface MedicationBody {
  name?: string
  dose?: string | null
  frequency?: string | null
  instructions?: string | null
  startDate?: string
  endDate?: string | null
  stoppedOn?: string | null
  appointmentId?: string | null
}

const idSchema = { type: 'string', minLength: 36, maxLength: 36 }
const date = { type: 'string', format: 'date' }
const optionalText = (maxLength: number) => ({
  anyOf: [{ type: 'string', maxLength }, { type: 'null' }],
})
const medicationProperties = {
  name: { type: 'string', minLength: 1, maxLength: 120 },
  dose: optionalText(120),
  frequency: optionalText(120),
  instructions: optionalText(2000),
  startDate: date,
  endDate: { anyOf: [date, { type: 'null' }] },
  stoppedOn: { anyOf: [date, { type: 'null' }] },
  appointmentId: { anyOf: [idSchema, { type: 'null' }] },
}

/** Still being given: not stopped, and the end date (if any) isn't past. */
function isActive(medication: MedicationDoc, today = clinicToday()) {
  if (medication.stoppedOn) return false
  return !medication.endDate || keyFromDate(medication.endDate) >= today
}

function serialize(medication: MedicationDoc, today = clinicToday()) {
  return {
    id: medication._id,
    patientId: medication.patientId,
    appointmentId: medication.appointmentId ?? null,
    name: medication.name,
    dose: medication.dose ?? null,
    frequency: medication.frequency ?? null,
    instructions: medication.instructions ?? null,
    startDate: keyFromDate(medication.startDate),
    endDate: medication.endDate ? keyFromDate(medication.endDate) : null,
    stoppedOn: medication.stoppedOn ? keyFromDate(medication.stoppedOn) : null,
    isActive: isActive(medication, today),
    prescribedByName: medication.prescribedByName ?? null,
    createdAt: medication.createdAt,
    updatedAt: medication.updatedAt,
  }
}

/** Current medications first, then the most recently started. */
function sortForDisplay(list: ReturnType<typeof serialize>[]) {
  return list.sort(
    (a, b) =>
      Number(b.isActive) - Number(a.isActive) || b.startDate.localeCompare(a.startDate),
  )
}

const text = (value: string | null | undefined) =>
  value === undefined ? undefined : value?.trim() || null

function checkDates(start: string, end: string | null | undefined) {
  if (end && end < start) return 'The end date must be on or after the start date.'
  return null
}

export const medicationRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { patientId: string } }>(
    '/patients/:patientId/medications',
    { schema: { params: { type: 'object', properties: { patientId: idSchema } } } },
    async (request, reply) => {
      if (!requireRequester(request, reply)) return
      const { patientId } = request.params
      if (!(await patientExists(patientId))) {
        return reply.status(404).send({ message: 'Patient not found' })
      }
      const today = clinicToday()
      const medications = await Medication.find({ patientId }).lean()
      return sortForDisplay(medications.map((medication) => serialize(medication, today)))
    },
  )

  /** Every patient's current medications (for the dashboard and patient list). */
  app.get('/medications/active', async (request, reply) => {
    if (!requireRequester(request, reply)) return
    const today = clinicToday()
    const medications = await Medication.find({
      stoppedOn: { $exists: false },
      $or: [{ endDate: { $exists: false } }, { endDate: { $gte: dateFromKey(today) } }],
    })
      .sort({ startDate: -1 })
      .lean()
    const patientIds = [...new Set(medications.map((medication) => medication.patientId))]
    const patients = await Patient.find({ _id: { $in: patientIds } }, { name: 1 }).lean()
    const names = new Map(patients.map((patient) => [patient._id, patient.name]))
    return medications
      .filter((medication) => names.has(medication.patientId))
      .map((medication) => ({
        ...serialize(medication, today),
        patientName: names.get(medication.patientId)!,
      }))
  })

  app.post<{ Params: { patientId: string }; Body: MedicationBody & { name: string; startDate: string } }>(
    '/patients/:patientId/medications',
    {
      schema: {
        params: { type: 'object', properties: { patientId: idSchema } },
        body: {
          type: 'object',
          required: ['name', 'startDate'],
          additionalProperties: false,
          properties: medicationProperties,
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
      const dateProblem = checkDates(body.startDate, body.endDate)
      if (dateProblem) return reply.status(400).send({ message: dateProblem })
      if (body.appointmentId) {
        const appointment = await getAppointment(body.appointmentId)
        if (appointment?.patientId !== patientId) {
          return reply.status(400).send({ message: 'That appointment does not belong to this patient.' })
        }
      }

      const medication = await Medication.create(
        withoutEmpty({
          patientId,
          appointmentId: body.appointmentId ?? null,
          name: body.name.trim(),
          dose: text(body.dose),
          frequency: text(body.frequency),
          instructions: text(body.instructions),
          startDate: dateFromKey(body.startDate),
          endDate: body.endDate ? dateFromKey(body.endDate) : null,
          stoppedOn: body.stoppedOn ? dateFromKey(body.stoppedOn) : null,
          prescribedById: requester.userId,
          prescribedByName: requester.name || null,
        }),
      )
      return reply.status(201).send(serialize(medication.toObject()))
    },
  )

  app.patch<{ Params: { medicationId: string }; Body: MedicationBody }>(
    '/medications/:medicationId',
    {
      schema: {
        params: { type: 'object', properties: { medicationId: idSchema } },
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: medicationProperties,
        },
      },
    },
    async (request, reply) => {
      if (!requireRequester(request, reply, 'editRecords')) return
      const existing = await Medication.findById(request.params.medicationId).lean()
      if (!existing) return reply.status(404).send({ message: 'Medication not found' })

      const body = request.body
      const start = body.startDate ?? keyFromDate(existing.startDate)
      const end =
        body.endDate === undefined
          ? existing.endDate && keyFromDate(existing.endDate)
          : body.endDate
      const dateProblem = checkDates(start, end)
      if (dateProblem) return reply.status(400).send({ message: dateProblem })

      const toDate = (value: string | null | undefined) =>
        value === undefined ? undefined : value ? dateFromKey(value) : null
      const medication = await Medication.findByIdAndUpdate(
        existing._id,
        toUpdate({
          name: body.name?.trim(),
          dose: text(body.dose),
          frequency: text(body.frequency),
          instructions: text(body.instructions),
          startDate: toDate(body.startDate),
          endDate: toDate(body.endDate),
          stoppedOn: toDate(body.stoppedOn),
        }),
        { new: true, runValidators: true },
      ).lean()
      if (!medication) return reply.status(404).send({ message: 'Medication not found' })
      return serialize(medication)
    },
  )

  app.delete<{ Params: { medicationId: string } }>(
    '/medications/:medicationId',
    async (request, reply) => {
      if (!requireRequester(request, reply, 'editRecords')) return
      const { deletedCount } = await Medication.deleteOne({ _id: request.params.medicationId })
      if (deletedCount === 0) return reply.status(404).send({ message: 'Medication not found' })
      return reply.status(204).send()
    },
  )
}
