import Fastify from 'fastify'
import httpProxy from '@fastify/http-proxy'
import { healthRoutes } from './routes/health.js'

export function buildApp() {
  const app = Fastify({
    logger: true,
  })

  app.register(healthRoutes)

  const clinicServiceUrl =
    process.env.CLINIC_SERVICE_URL ?? 'http://localhost:3001'

  app.register(httpProxy, {
    upstream: clinicServiceUrl,
    prefix: '/clinic',
    rewritePrefix: '',
  })

  return app
}