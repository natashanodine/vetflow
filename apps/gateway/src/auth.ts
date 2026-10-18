import type { FastifyReply, FastifyRequest } from 'fastify'

const SESSION_COOKIE = 'equora_session'

/** Paths reachable without signing in (relative to the gateway). */
const PUBLIC_PATHS = new Set([
  '/health',
  '/identity/auth/login',
  '/identity/auth/logout',
])

/** Identity headers only the gateway may set; anything sent by a browser is dropped. */
const TRUSTED_HEADERS = [
  'x-internal-token',
  'x-user-id',
  'x-user-role',
  'x-user-name',
  'x-user-is-vet',
]

export interface SessionUser {
  id: string
  name: string
  role: string
  isVeterinarian: boolean
}

declare module 'fastify' {
  interface FastifyRequest {
    sessionUser?: SessionUser
  }
}

function readCookie(header: string | undefined, name: string) {
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return undefined
}

export function internalToken() {
  const token = process.env.INTERNAL_API_TOKEN
  if (!token) throw new Error('INTERNAL_API_TOKEN must be set')
  return token
}

/** Verifies the session with identity-service before any request is proxied. */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  for (const header of TRUSTED_HEADERS) delete request.headers[header]

  const path = request.url.split('?')[0] ?? ''
  if (PUBLIC_PATHS.has(path)) return

  const token = readCookie(request.headers.cookie, SESSION_COOKIE)
  if (!token) {
    return reply
      .status(401)
      .send({ message: 'Authentication required', reason: 'signed-out' })
  }

  const identityUrl = process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3003'
  let response: Response
  try {
    response = await fetch(`${identityUrl}/internal/session`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-internal-token': internalToken(),
      },
      body: JSON.stringify({ token }),
    })
  } catch (error) {
    request.log.error(error, 'Identity service unreachable')
    return reply.status(503).send({ message: 'Sign-in service unavailable' })
  }

  if (response.status === 401) {
    const body = (await response.json().catch(() => ({}))) as { reason?: string }
    return reply
      .status(401)
      .header(
        'set-cookie',
        `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      )
      .send({
        message: 'Authentication required',
        reason: body.reason ?? 'signed-out',
      })
  }
  if (!response.ok) {
    return reply.status(503).send({ message: 'Sign-in service unavailable' })
  }

  request.sessionUser = (await response.json()) as SessionUser
}

/** Headers added to every proxied request so services know who is asking. */
export function trustedHeaders(request: { sessionUser?: SessionUser | undefined }) {
  const user = request.sessionUser
  return {
    'x-internal-token': internalToken(),
    ...(user && {
      'x-user-id': user.id,
      'x-user-role': user.role,
      // Names can contain accents, which are not valid in raw headers.
      'x-user-name': encodeURIComponent(user.name),
      'x-user-is-vet': String(user.isVeterinarian),
    }),
  }
}
