import type { FastifyPluginAsync } from 'fastify'

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'vetflow-gateway',
      timestamp: new Date().toISOString(),
    }
  })
}