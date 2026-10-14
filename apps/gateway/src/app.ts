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
  const schedulingServiceUrl =
    process.env.SCHEDULING_SERVICE_URL ?? 'http://localhost:3002'

  app.register(httpProxy, {
    upstream: clinicServiceUrl,
    prefix: '/clinic',
    rewritePrefix: '',
  })

  app.register(httpProxy, {
    upstream: schedulingServiceUrl,
    prefix: '/schedule',
    rewritePrefix: '',
  })

  return app
}
