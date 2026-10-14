import Fastify from 'fastify'
import { prisma } from './lib/prisma.js'
import { appointmentRoutes } from './routes/appointments.js'
import { healthRoutes } from './routes/health.js'

export function buildApp() {
  const app = Fastify({ logger: true })

  app.register(healthRoutes)
  app.register(appointmentRoutes)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })

  return app
}
