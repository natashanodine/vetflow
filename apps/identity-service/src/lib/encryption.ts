import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
} from 'node:crypto'

/**
 * Encryption for personal login data (names and emails) stored in MongoDB.
 *
 * - Values are encrypted with AES-256-GCM (authenticated: tampering is
 *   detected) and a fresh random IV each time.
 * - Emails also get a keyed HMAC fingerprint ("blind index") so a user can be
 *   found by email without storing the email in readable form.
 * - Both keys are derived from DATA_ENCRYPTION_KEY. Losing or changing that
 *   key makes the stored names and emails unreadable, so keep a safe copy.
 */
const PREFIX = 'enc:v1:'
const IV_BYTES = 12
const TAG_BYTES = 16

let keys: { encryption: Buffer; index: Buffer } | null = null

function getKeys() {
  if (keys) return keys
  const secret = process.env.DATA_ENCRYPTION_KEY
  if (!secret || secret.length < 32) {
    throw new Error('DATA_ENCRYPTION_KEY must be set to at least 32 characters')
  }
  const derive = (info: string) =>
    Buffer.from(hkdfSync('sha256', secret, 'equora-identity', info, 32))
  keys = { encryption: derive('field-encryption'), index: derive('email-index') }
  return keys
}

/** Fails fast at startup if the key is missing. */
export function assertEncryptionConfigured() {
  getKeys()
}

export function isEncrypted(value: string) {
  return value.startsWith(PREFIX)
}

export function encryptText(plain: string) {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv('aes-256-gcm', getKeys().encryption, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return PREFIX + Buffer.concat([iv, tag, ciphertext]).toString('base64url')
}

/** Decrypts a stored value; values from before encryption pass through. */
export function decryptText(stored: string) {
  if (!isEncrypted(stored)) return stored
  const data = Buffer.from(stored.slice(PREFIX.length), 'base64url')
  const iv = data.subarray(0, IV_BYTES)
  const tag = data.subarray(IV_BYTES, IV_BYTES + TAG_BYTES)
  const ciphertext = data.subarray(IV_BYTES + TAG_BYTES)
  const decipher = createDecipheriv('aes-256-gcm', getKeys().encryption, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/** Lookup fingerprint for an already-normalized email address. */
export function emailIndex(normalizedEmail: string) {
  return createHmac('sha256', getKeys().index).update(normalizedEmail).digest('hex')
}
