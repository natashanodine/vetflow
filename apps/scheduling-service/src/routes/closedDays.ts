import type { FastifyPluginAsync } from 'fastify'
import { addDays, dayKey, fromClinicTime, parseDayKey } from '../lib/clinicHours.js'
import { requireEditor } from '../lib/requester.js'
import { Appointment, ClosedDay, serializeClosedDay } from '../models/index.js'

const DATE_PATTERN = '^\\d{4}-\\d{2}-\\d{2}$'

/** Appointments (not cancelled) booked on a clinic day. */
function appointmentsOn(date: string) {
  const day = parseDayKey(date)
  return Appointment.countDocuments({
    status: { $ne: 'CANCELLED' },
    startsAt: { $gte: fromClinicTime(day, 0), $lt: fromClinicTime(addDays(day, 1), 0) },
  })
}

/** Holidays and other dates the clinic is closed. */
export const closedDayRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: { from?: string; to?: string } }>(
    '/closed-days',
    {
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            from: { type: 'string', pattern: DATE_PATTERN },
            to: { type: 'string', pattern: DATE_PATTERN },
          },
        },
      },
    },
    async (request) => {
      const { from, to } = request.query
      const days = await ClosedDay.find({
        ...((from || to) && {
          _id: { ...(from && { $gte: from }), ...(to && { $lte: to }) },
        }),
      })
        .sort({ _id: 1 })
        .lean()
      return days.map(serializeClosedDay)
    },
  )

  app.put<{ Params: { date: string }; Body: { reason?: string } }>(
    '/closed-days/:date',
    {
      schema: {
        params: {
          type: 'object',
          required: ['date'],
          properties: { date: { type: 'string', pattern: DATE_PATTERN } },
        },
        body: {
          type: 'object',
          additionalProperties: false,
          properties: { reason: { type: 'string', maxLength: 120 } },
        },
      },
    },
    async (request, reply) => {
      if (!requireEditor(request, reply, 'Only admins and vets can change closed dates.')) return
      const { date } = request.params
      // Rejects impossible dates like 2026-02-30.
      if (dayKey(addDays(parseDayKey(date), 0)) !== date) {
        return reply.status(400).send({ message: 'That is not a valid date.' })
      }
      const reason = request.body?.reason?.trim()
      const closedDay = await ClosedDay.findByIdAndUpdate(
        date,
        reason ? { $set: { reason } } : { $unset: { reason: '' } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ).lean()
      return {
        ...serializeClosedDay(closedDay!),
        // So the person can rearrange anything already booked that day.
        appointmentsThatDay: await appointmentsOn(date),
      }
    },
  )

  app.delete<{ Params: { date: string } }>(
    '/closed-days/:date',
    {
      schema: {
        params: {
          type: 'object',
          required: ['date'],
          properties: { date: { type: 'string', pattern: DATE_PATTERN } },
        },
      },
    },
    async (request, reply) => {
      if (!requireEditor(request, reply, 'Only admins and vets can change closed dates.')) return
      const { deletedCount } = await ClosedDay.deleteOne({ _id: request.params.date })
      if (deletedCount === 0) return reply.status(404).send({ message: 'That date is not closed' })
      return reply.status(204).send()
    },
  )
}
