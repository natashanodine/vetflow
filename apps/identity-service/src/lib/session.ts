import { SignJWT, jwtVerify } from 'jose'

/** Name of the browser cookie that holds the session JWT. */
export const SESSION_COOKIE = 'equora_session'
const SESSION_DAYS = 7
const ISSUER = 'equora-identity'
const AUDIENCE = 'equora'

function secretKey() {
  const value = process.env.SESSION_SECRET
  if (!value || value.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters')
  }
  return new TextEncoder().encode(value)
}

export interface SessionPayload {
  /** User id */
  sub: string
  /** User.sessionVersion when the token was issued */
  sv: number
}

/**
 * Issues a signed JSON Web Token (HS256). It lives only in an HttpOnly
 * cookie, so page scripts can never read it. The `sv` claim is compared with
 * the user's current sessionVersion on every request, so a password change,
 * reset or deactivation revokes older tokens straight away.
 */
export function createSessionToken(userId: string, sessionVersion: number) {
  return new SignJWT({ sv: sessionVersion })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(userId)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secretKey())
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ['HS256'],
      issuer: ISSUER,
      audience: AUDIENCE,
    })
    if (typeof payload.sub !== 'string' || typeof payload.sv !== 'number') {
      return null
    }
    return { sub: payload.sub, sv: payload.sv }
  } catch {
    // Bad signature, expired, wrong issuer/audience or not a JWT at all.
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
