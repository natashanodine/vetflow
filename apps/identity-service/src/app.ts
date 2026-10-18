import Fastify from 'fastify'
import { disconnectDatabase } from './lib/db.js'
import { hasValidInternalToken } from './lib/requester.js'
import { authRoutes } from './routes/auth.js'
import { clinicRoutes } from './routes/clinic.js'
import { healthRoutes } from './routes/health.js'
import { internalRoutes } from './routes/internal.js'
import { teamRoutes } from './routes/team.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  // Only the gateway and sibling services may call this service.
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return
    if (!hasValidInternalToken(request)) {
      return reply.status(401).send({ message: 'Unauthorized' })
    }
  })

  app.register(healthRoutes)
  app.register(authRoutes)
  app.register(teamRoutes)
  app.register(clinicRoutes)
  app.register(internalRoutes)

  app.addHook('onClose', async () => {
    await disconnectDatabase()
  })

  return app
}
