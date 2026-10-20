import type { FastifyPluginAsync } from 'fastify'
import { parseClock, scheduleRules } from '../lib/clinicHours.js'
import { requireAdmin } from '../lib/requester.js'
import { saveWeeklyHours } from '../lib/weeklyHours.js'

interface HoursBody {
  days: { weekday: number; open: boolean; opensAt: string; closesAt: string }[]
}

const CLOCK = '^([01]\\d|2[0-3]):[0-5]\\d$'

/** The clinic's weekly opening hours (read with GET /schedule-rules). */
export const clinicHoursRoutes: FastifyPluginAsync = async (app) => {
  app.put<{ Body: HoursBody }>(
    '/clinic-hours',
    {
      schema: {
        body: {
          type: 'object',
          required: ['days'],
          additionalProperties: false,
          properties: {
            days: {
              type: 'array',
              minItems: 7,
              maxItems: 7,
              items: {
                type: 'object',
                required: ['weekday', 'open', 'opensAt', 'closesAt'],
                additionalProperties: false,
                properties: {
                  weekday: { type: 'integer', minimum: 0, maximum: 6 },
                  open: { type: 'boolean' },
                  opensAt: { type: 'string', pattern: CLOCK },
                  closesAt: { type: 'string', pattern: CLOCK },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      if (!requireAdmin(request, reply, 'Only admins can change the opening hours.')) return

      const days = request.body.days.map((day) => ({
        weekday: day.weekday,
        open: day.open,
        opensAt: parseClock(day.opensAt),
        closesAt: parseClock(day.closesAt),
      }))
      if (new Set(days.map((day) => day.weekday)).size !== 7) {
        return reply.status(400).send({ message: 'Give the hours for each day of the week once.' })
      }
      const badDay = days.find((day) => day.open && day.opensAt >= day.closesAt)
      if (badDay) {
        return reply.status(400).send({
          message: `On ${weekdayName(badDay.weekday)} the closing time must be after the opening time.`,
        })
      }
      if (!days.some((day) => day.open)) {
        return reply.status(400).send({ message: 'The clinic must be open at least one day a week.' })
      }

      const saved = await saveWeeklyHours(days.sort((a, b) => a.weekday - b.weekday))
      return scheduleRules(saved)
    },
  )
}

function weekdayName(weekday: number) {
  return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday]
}
