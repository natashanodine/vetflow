import { createHmac, timingSafeEqual } from 'node:crypto'

/** Name of the browser cookie that holds the signed session. */
export const SESSION_COOKIE = 'equora_session'
const SESSION_DAYS = 7

function secret() {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters')
  }
  return value
}

interface SessionPayload {
  /** User id */
  sub: string
  /** User.sessionVersion when the session was issued */
  sv: number
  /** Expiry, seconds since epoch */
  exp: number
}

function sign(data: string) {
  return createHmac('sha256', secret()).update(data).digest('base64url')
}

export function createSessionToken(userId: string, sessionVersion: number) {
  const payload: SessionPayload = {
    sub: userId,
    sv: sessionVersion,
    exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 24 * 60 * 60,
  }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${data}.${sign(data)}`
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [data, signature] = token.split('.')
  if (!data || !signature) return null

  const expected = Buffer.from(sign(data))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null
  }

  try {
    const payload = JSON.parse(
      Buffer.from(data, 'base64url').toString('utf8'),
    ) as SessionPayload
    if (typeof payload.sub !== 'string' || typeof payload.sv !== 'number') {
      return null
    }
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

function cookieAttributes(maxAgeSeconds: number) {
  const secure = process.env.COOKIE_SECURE === 'true' ? '; Secure' : ''
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`
}

export function sessionCookie(token: string) {
  return `${SESSION_COOKIE}=${token}; ${cookieAttributes(SESSION_DAYS * 24 * 60 * 60)}`
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; ${cookieAttributes(0)}`
}
