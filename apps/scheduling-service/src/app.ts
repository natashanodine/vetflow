import Fastify from 'fastify'
import { disconnectDatabase } from './lib/db.js'
import { appointmentRoutes } from './routes/appointments.js'
import { healthRoutes } from './routes/health.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  // Only the gateway and sibling services may call this service.
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return
    const expected = process.env.INTERNAL_API_TOKEN
    if (!expected || request.headers['x-internal-token'] !== expected) {
      return reply.status(401).send({ message: 'Unauthorized' })
    }
  })

  app.register(healthRoutes)
  app.register(appointmentRoutes)

  app.addHook('onClose', async () => {
    await disconnectDatabase()
  })

  return app
}
