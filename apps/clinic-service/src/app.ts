import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import mongoose from 'mongoose'
import { disconnectDatabase, isDuplicateKeyError } from './lib/db.js'
import { hasValidInternalToken } from './lib/requester.js'
import { attachmentRoutes, MAX_ATTACHMENT_BYTES } from './routes/attachments.js'
import { healthRoutes } from './routes/health.js'
import { ownerRoutes } from './routes/owners.js'
import { patientRoutes } from './routes/patients.js'
import { recordRoutes } from './routes/records.js'

export function buildApp() {
  const app = Fastify({
    logger: true,
  })

  // Only the gateway and sibling services may call this service.
  app.addHook('onRequest', async (request, reply) => {
    if (request.url === '/health') return
    if (!hasValidInternalToken(request)) {
      return reply.status(401).send({ message: 'Unauthorized' })
    }
  })

  app.register(multipart, {
    limits: { fileSize: MAX_ATTACHMENT_BYTES, files: 1, fields: 10 },
  })

  app.register(healthRoutes)
  app.register(ownerRoutes)
  app.register(patientRoutes)
  app.register(recordRoutes)
  app.register(attachmentRoutes)

  app.setErrorHandler((error, request, reply) => {
    if (isDuplicateKeyError(error)) {
      return reply
        .status(409)
        .send({ message: 'That value is already in use (for example an email or microchip).' })
    }
    if (
      (error as { validation?: unknown }).validation ||
      error instanceof mongoose.Error.ValidationError ||
      error instanceof mongoose.Error.CastError
    ) {
      return reply.status(400).send({ message: (error as Error).message })
    }
    const statusCode = (error as { statusCode?: number }).statusCode ?? 500
    if (statusCode < 500) {
      return reply.status(statusCode).send({ message: (error as Error).message })
    }
    request.log.error(error)
    return reply.status(500).send({ message: 'Something went wrong.' })
  })

  app.addHook('onClose', async () => {
    await disconnectDatabase()
  })

  return app
}
