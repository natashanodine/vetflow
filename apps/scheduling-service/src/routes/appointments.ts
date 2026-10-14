import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'

type AppointmentCategory = 'APPOINTMENT' | 'TREATMENT' | 'REPRODUCTION'
type AppointmentStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

interface AppointmentQuery {
  from?: string
  to?: string
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
          },
        },
      },
    },
    async (request) => {
      const { from, to } = request.query

      return prisma.appointment.findMany({
        ...(from || to
          ? {
              where: {
                startsAt: {
                  ...(from && { gte: new Date(from) }),
                  ...(to && { lte: new Date(to) }),
                },
              },
            }
          : {}),
        orderBy: {
          startsAt: 'asc',
        },
      })
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
      const appointment = await prisma.appointment.findUnique({
        where: { id: request.params.appointmentId },
      })

      if (!appointment) {
        return reply.status(404).send({ message: 'Appointment not found' })
      }

      return appointment
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
      const patientResponse = await fetch(
        `${clinicServiceUrl}/patients/${request.body.patientId}`,
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

      const appointment = await prisma.appointment.create({
        data: {
          patientId: patient.id,
          patientName: patient.name,
          ownerId: patient.ownerId,
          title: body.title,
          startsAt: new Date(body.startsAt),
          durationMinutes: body.durationMinutes ?? 30,
          category: body.category ?? 'APPOINTMENT',
          ...(body.details !== undefined && { details: body.details }),
        },
      })

      return reply.status(201).send(appointment)
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
      const existingAppointment = await prisma.appointment.findUnique({
        where: { id: request.params.appointmentId },
      })

      if (!existingAppointment) {
        return reply.status(404).send({ message: 'Appointment not found' })
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
      const appointment = await prisma.appointment.update({
        where: { id: request.params.appointmentId },
        data: {
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
      })

      return appointment
    },
  )
}
