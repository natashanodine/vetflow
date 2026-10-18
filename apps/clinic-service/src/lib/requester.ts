import type { FastifyReply, FastifyRequest } from 'fastify'

export type ClinicRole = 'ADMIN' | 'VETERINARIAN' | 'STAFF'

const rules = {
  /** Edit patients and owners, write medical history, delete files. */
  editRecords: ['ADMIN', 'VETERINARIAN'],
} as const satisfies Record<string, readonly ClinicRole[]>

export type Permission = keyof typeof rules

/** Calls must come through the gateway or a sibling service. */
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

/** Replies 401/403 and returns null when the requester may not continue. */
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
  if (
    permission &&
    !(rules[permission] as readonly string[]).includes(requester.role)
  ) {
    void reply
      .status(403)
      .send({ message: 'Your role does not allow this action.' })
    return null
  }
  return requester
}
