import type { FastifyPluginAsync } from 'fastify'

/** Give up on waking the services after this long. */
const WAKE_TIMEOUT_MS = 150_000
const RETRY_DELAY_MS = 2_000

function serviceUrls() {
  return {
    identity: process.env.IDENTITY_SERVICE_URL ?? 'http://localhost:3003',
    clinic: process.env.CLINIC_SERVICE_URL ?? 'http://localhost:3001',
    scheduling: process.env.SCHEDULING_SERVICE_URL ?? 'http://localhost:3002',
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** Polls a service's /health until it answers with real JSON, or time runs out. */
async function waitUntilHealthy(url: string, deadline: number) {
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/health`, {
        signal: AbortSignal.timeout(Math.max(1_000, deadline - Date.now())),
      })
      // A sleeping host can answer with a holding page, so check the body too.
      const body = (await response.json().catch(() => null)) as { status?: string } | null
      if (response.ok && body?.status === 'ok') return true
    } catch {
      // Not up yet.
    }
    await sleep(RETRY_DELAY_MS)
  }
  return false
}

/**
 * On hosts that put idle services to sleep (such as Render's free plan),
 * the web app calls this before signing in so every service starts waking
 * at the same time instead of one after another. Instant when all are up.
 */
export const wakeRoutes: FastifyPluginAsync = async (app) => {
  app.get('/wake', async (request, reply) => {
    const deadline = Date.now() + WAKE_TIMEOUT_MS
    const entries = Object.entries(serviceUrls())
    const results = await Promise.all(
      entries.map(async ([name, url]) => [name, await waitUntilHealthy(url, deadline)] as const),
    )

    const asleep = results.filter(([, ready]) => !ready).map(([name]) => name)
    if (asleep.length > 0) {
      request.log.warn({ asleep }, 'Services did not wake up in time')
      return reply.status(503).send({ ready: false, asleep })
    }
    return { ready: true }
  })
}
