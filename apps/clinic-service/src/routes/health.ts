import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../lib/prisma.js'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    await prisma.owner.count()

    return {
      status: 'ok',
      service: 'clinic-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    }
  })
}