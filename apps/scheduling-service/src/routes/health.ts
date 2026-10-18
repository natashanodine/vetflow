import type { FastifyPluginAsync } from 'fastify'
import { pingDatabase } from '../lib/db.js'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    await pingDatabase()

    return {
      status: 'ok',
      service: 'scheduling-service',
      database: 'connected',
      timestamp: new Date().toISOString(),
    }
  })
}
