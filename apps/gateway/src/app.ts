import Fastify from 'fastify'
import httpProxy from '@fastify/http-proxy'
import { authenticate, trustedHeaders } from './auth.js'
import { healthRoutes } from './routes/health.js'
import { wakeRoutes } from './routes/wake.js'

// Files (X-rays, lab results) can be large; nginx enforces the same limit.
const MAX_BODY_BYTES = 20 * 1024 * 1024

export function buildApp() {
  const app = Fastify({
    logger: true,
    bodyLimit: MAX_BODY_BYTES,
  })

  app.register(healthRoutes)
  app.register(wakeRoutes)

  const services = [
    {
      prefix: '/clinic',
      upstream: process.env.CLINIC_SERVICE_URL ?? 'http://localhost:3001',
    },
    {
      prefix: '/schedule',
      upstream: process.env.SCHEDULING_SERVICE_URL ?? 'http://localhost:3002',
    },
    {
      prefix: '/identity',
      upstream: process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3003',
    },
  ]

  for (const service of services) {
    app.register(httpProxy, {
      upstream: service.upstream,
      prefix: service.prefix,
      rewritePrefix: '',
      preHandler: authenticate,
      replyOptions: {
        rewriteRequestHeaders: (request, headers) => ({
          ...headers,
          ...trustedHeaders(request),
        }),
        // A service that is down or still waking up (free hosting) is a
        // temporary condition: answer 503/504 so the web app waits and
        // retries, instead of a generic 500.
        onError: (reply, { error }) => {
          const timedOut = (error as { statusCode?: number }).statusCode === 504
          reply.log.warn({ error, upstream: service.upstream }, 'Upstream service unavailable')
          void reply.status(timedOut ? 504 : 503).send({
            message: 'The clinic system is starting up. Please try again in a moment.',
          })
        },
      },
    })
  }

  return app
}
