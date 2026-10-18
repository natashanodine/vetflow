import type { FastifyReply, FastifyRequest } from 'fastify'
import { can, type ClinicRole, type Permission } from './permissions.js'

/**
 * Every route except /health must be called through the gateway (or by a
 * sibling service), which proves itself with the shared internal token.
 */
export function hasValidInternalToken(request: FastifyRequest) {
  const expected = process.env.INTERNAL_API_TOKEN
  return Boolean(expected) && request.headers['x-internal-token'] === expected
}

export interface Requester {
  userId: string
  role: ClinicRole
  name: string
}

/** The signed-in user, as verified and forwarded by the gateway. */
export function getRequester(request: FastifyRequest): Requester | null {
  const userId = request.headers['x-user-id']
  const role = request.headers['x-user-role']
  const name = request.headers['x-user-name']
  if (typeof userId !== 'string' || typeof role !== 'string') return null
  return {
    userId,
    role: role as ClinicRole,
    name: typeof name === 'string' ? decodeURIComponent(name) : '',
  }
}

/** Replies with 401/403 and returns null when the requester may not continue. */
export function requireRequester(
  request: FastifyRequest,
  reply: FastifyReply,
  permission?: Permission,
): Requester | null {
  const requester = getRequester(request)
  if (!requester) {
    void reply.status(401).send({ message: 'Authentication required' })
    return null
  }
  if (permission && !can(requester.role, permission)) {
    void reply
      .status(403)
      .send({ message: 'Your role does not allow this action.' })
    return null
  }
  return requester
}
