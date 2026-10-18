import type { FastifyPluginAsync } from 'fastify'
import { Appointment, serializeAppointment } from '../models/index.js'

type AppointmentCategory = 'APPOINTMENT' | 'TREATMENT' | 'REPRODUCTION'
type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

interface AppointmentQuery {
  from?: string
  to?: string
  patientId?: string
}

// Allow a minute of clock drift between the browser and the server.
const PAST_GRACE_MS = 60_000

function isInPast(date: Date) {
  return date.getTime() < Date.now() - PAST_GRACE_MS
}

const toMinute = (date: Date) => Math.floor(date.getTime() / 60_000)

function clinicHeaders() {
  return { 'x-internal-token': process.env.INTERNAL_API_TOKEN ?? '' }
}

interface CreateAppointmentBody {
  patientId: string
  title: string
  details?: string
  startsAt: string
  durationMinutes?: number
  category?: AppointmentCategory
}

interface AppointmentParams {
  appointmentId: string
}

interface UpdateAppointmentBody {
  patientId?: string
  title?: string
  details?: string
  startsAt?: string
  durationMinutes?: number
  category?: AppointmentCategory
  status?: AppointmentStatus
}

interface ClinicPatient {
  id: string
  name: string
  ownerId: string
}

export const appointmentRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: AppointmentQuery }>(
    '/appointments',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', format: 'date-time' },
            to: { type: 'string', format: 'date-time' },
            patientId: { type: 'string', minLength: 36, maxLength: 36 },
          },
        },
      },
    },
    async (request) => {
      const { from, to, patientId } = request.query

      const appointments = await Appointment.find({
        ...(patientId && { patientId }),
        ...((from || to) && {
          startsAt: {
            ...(from && { $gte: new Date(from) }),
            ...(to && { $lte: new Date(to) }),
          },
        }),
      })
        .sort({ startsAt: 1 })
        .lean()
      return appointments.map(serializeAppointment)
    },
  )

  app.get<{ Params: AppointmentParams }>(
    '/appointments/:appointmentId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['appointmentId'],
          additionalProperties: false,
          properties: {
            appointmentId: { type: 'string', minLength: 36, maxLength: 36 },
          },
        },
      },
    },
    async (request, reply) => {
      const appointment = await Appointment.findById(
        request.params.appointmentId,
      ).lean()

      if (!appointment) {
        return reply.status(404).send({ message: 'Appointment not found' })
      }

      return serializeAppointment(appointment)
    },
  )

  app.post<{ Body: CreateAppointmentBody }>(
    '/appointments',
    {
      schema: {
        body: {
          type: 'object',
          required: ['patientId', 'title', 'startsAt'],
          additionalProperties: false,
          properties: {
            patientId: { type: 'string', minLength: 36, maxLength: 36 },
            title: { type: 'string', minLength: 1, maxLength: 160 },
            details: { type: 'string', maxLength: 5000 },
            startsAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer', minimum: 5, maximum: 1440 },
            category: {
              type: 'string',
              enum: ['APPOINTMENT', 'TREATMENT', 'REPRODUCTION'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const clinicServiceUrl =
        process.env.CLINIC_SERVICE_URL ?? 'http://localhost:3001'
      if (isInPast(new Date(request.body.startsAt))) {
        return reply
          .status(400)
          .send({ message: 'Appointments cannot be booked in the past.' })
      }

      const patientResponse = await fetch(
        `${clinicServiceUrl}/patients/${request.body.patientId}`,
        { headers: clinicHeaders() },
      )

      if (patientResponse.status === 404) {
        return reply.status(400).send({ message: 'Patient does not exist' })
      }

      if (!patientResponse.ok) {
        request.log.error(
          { statusCode: patientResponse.status },
          'Unable to verify patient with clinic service',
        )
        return reply.status(502).send({
          message: 'Unable to verify patient',
        })
      }

      const patient = (await patientResponse.json()) as ClinicPatient
      const body = request.body

      const appointment = await Appointment.create({
        patientId: patient.id,
        patientName: patient.name,
        ownerId: patient.ownerId,
        title: body.title,
        startsAt: new Date(body.startsAt),
        durationMinutes: body.durationMinutes ?? 30,
        category: body.category ?? 'APPOINTMENT',
        ...(body.details !== undefined && { details: body.details }),
      })

      return reply.status(201).send(serializeAppointment(appointment.toObject()))
    },
  )

  app.patch<{ Params: AppointmentParams; Body: UpdateAppointmentBody }>(
    '/appointments/:appointmentId',
    {
      schema: {
        params: {
          type: 'object',
          required: ['appointmentId'],
          additionalProperties: false,
          properties: {
            appointmentId: { type: 'string', minLength: 36, maxLength: 36 },
          },
        },
        body: {
          type: 'object',
          minProperties: 1,
          additionalProperties: false,
          properties: {
            patientId: { type: 'string', minLength: 36, maxLength: 36 },
            title: { type: 'string', minLength: 1, maxLength: 160 },
            details: { type: 'string', maxLength: 5000 },
            startsAt: { type: 'string', format: 'date-time' },
            durationMinutes: { type: 'integer', minimum: 5, maximum: 1440 },
            category: {
              type: 'string',
              enum: ['APPOINTMENT', 'TREATMENT', 'REPRODUCTION'],
            },
            status: {
              type: 'string',
              enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED'],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const existingAppointment = await Appointment.findById(
        request.params.appointmentId,
      ).lean()

      if (!existingAppointment) {
        return reply.status(404).send({ message: 'Appointment not found' })
      }

      if (request.body.startsAt !== undefined) {
        const startsAt = new Date(request.body.startsAt)
        const isRescheduled =
          toMinute(startsAt) !== toMinute(existingAppointment.startsAt)
        if (isRescheduled && isInPast(startsAt)) {
          return reply
            .status(400)
            .send({ message: 'Appointments cannot be moved into the past.' })
        }
      }

      let patient: ClinicPatient | undefined

      if (
        request.body.patientId &&
        request.body.patientId !== existingAppointment.patientId
      ) {
        const clinicServiceUrl =
          process.env.CLINIC_SERVICE_URL ?? 'http://localhost:3001'
        const patientResponse = await fetch(
          `${clinicServiceUrl}/patients/${request.body.patientId}`,
          { headers: clinicHeaders() },
        )

        if (patientResponse.status === 404) {
          return reply.status(400).send({ message: 'Patient does not exist' })
        }

        if (!patientResponse.ok) {
          request.log.error(
            { statusCode: patientResponse.status },
            'Unable to verify patient with clinic service',
          )
          return reply.status(502).send({ message: 'Unable to verify patient' })
        }

        patient = (await patientResponse.json()) as ClinicPatient
      }

      const body = request.body
      const appointment = await Appointment.findByIdAndUpdate(
        existingAppointment._id,
        {
          $set: {
            ...(patient && {
              patientId: patient.id,
              patientName: patient.name,
              ownerId: patient.ownerId,
            }),
            ...(body.title !== undefined && { title: body.title }),
            ...(body.details !== undefined && { details: body.details }),
            ...(body.startsAt !== undefined && {
              startsAt: new Date(body.startsAt),
            }),
            ...(body.durationMinutes !== undefined && {
              durationMinutes: body.durationMinutes,
            }),
            ...(body.category !== undefined && { category: body.category }),
            ...(body.status !== undefined && { status: body.status }),
          },
        },
        { new: true, runValidators: true },
      ).lean()

      if (!appointment) {
        return reply.status(404).send({ message: 'Appointment not found' })
      }

      return serializeAppointment(appointment)
    },
  )

  /** Called by clinic-service when a patient's name or owner changes. */
  app.patch<{
    Params: { patientId: string }
    Body: { patientName?: string; ownerId?: string }
  }>(
    '/internal/patients/:patientId',
    {
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            patientName: { type: 'string', minLength: 1, maxLength: 100 },
            ownerId: { type: 'string', minLength: 36, maxLength: 36 },
          },
        },
      },
    },
    async (request) => {
      const { patientName, ownerId } = request.body
      const result = await Appointment.updateMany(
        { patientId: request.params.patientId },
        {
          $set: {
            ...(patientName !== undefined && { patientName }),
            ...(ownerId !== undefined && { ownerId }),
          },
        },
      )
      return { updated: result.modifiedCount }
    },
  )
}
