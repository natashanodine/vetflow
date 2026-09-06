import Fastify from 'fastify'
import { prisma } from './lib/prisma.js'
import { healthRoutes } from './routes/health.js'
import { ownerRoutes } from './routes/owners.js'

export function buildApp() {
  const app = Fastify({
    logger: true,
  })

  app.register(healthRoutes)
  app.register(ownerRoutes)

  app.addHook('onClose', async () => {
    await prisma.$disconnect()
  })

  return app
}