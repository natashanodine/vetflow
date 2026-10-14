import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    await prisma.appointment.count()

    return {
      status: 'ok',
      service: 'scheduling-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    }
  })
}
