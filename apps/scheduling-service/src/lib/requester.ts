import type { FastifyReply, FastifyRequest } from 'fastify'

/** Roles that may change clinic records (set by the gateway after sign-in). */
const EDITOR_ROLES = new Set(['ADMIN', 'VETERINARIAN'])

export function requireEditor(request: FastifyRequest, reply: FastifyReply) {
  const role = request.headers['x-user-role']
  if (typeof role !== 'string' || !EDITOR_ROLES.has(role)) {
    void reply
      .status(403)
      .send({ message: 'Only admins and vets can change treatment plans.' })
    return false
  }
  return true
}
