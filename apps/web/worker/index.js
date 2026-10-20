/**
 * Cloudflare Worker for the Equora website.
 *
 * Static files (the built React app) are served by Cloudflare directly. Only
 * requests to /api/* reach this code; they are forwarded to the backend
 * gateway on Render (API_ORIGIN), with the /api prefix removed, just like
 * nginx does in Docker. Because the browser only ever talks to this one
 * site, sign-in cookies work without any cross-site setup.
 */
/** How long one /api/wake call keeps trying before answering. */
const WAKE_TIMEOUT_MS = 55_000
const RETRY_DELAY_MS = 3_000

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Polls a service's /health until it answers with real JSON (a sleeping
 * host can answer with a holding page instead), or time runs out.
 * @param {string} baseUrl
 * @param {number} deadline
 */
async function waitUntilHealthy(baseUrl, deadline) {
  // Few attempts, each allowed to wait a long time: free Cloudflare Workers
  // may make at most 50 outgoing requests per call.
  for (let attempt = 0; attempt < 10 && Date.now() < deadline; attempt++) {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(Math.max(1_000, Math.min(30_000, deadline - Date.now()))),
      })
      const body = await response.json().catch(() => null)
      if (response.ok && body && body.status === 'ok') return true
    } catch {
      // Not up yet.
    }
    await sleep(RETRY_DELAY_MS)
  }
  return false
}

/**
 * Wakes every backend service directly from here. Hosts that put idle
 * services to sleep (Render's free plan) only wake them for requests from
 * outside, so the gateway can't reliably wake its neighbours itself.
 * @param {string} wakeUrls comma-separated service base URLs
 */
async function wakeAll(wakeUrls) {
  const urls = wakeUrls
    .split(',')
    .map((value) => value.trim().replace(/\/$/, ''))
    .filter(Boolean)
  const deadline = Date.now() + WAKE_TIMEOUT_MS
  const results = await Promise.all(
    urls.map(async (baseUrl) => [baseUrl, await waitUntilHealthy(baseUrl, deadline)]),
  )
  const asleep = results
    .filter(([, ready]) => !ready)
    .map(([baseUrl]) => new URL(baseUrl).hostname.split('.')[0])
  return asleep.length === 0
    ? Response.json({ ready: true })
    : Response.json({ ready: false, asleep }, { status: 503 })
}

export default {
  /**
   * @param {Request} request
   * @param {{ API_ORIGIN?: string, WAKE_URLS?: string, ASSETS: { fetch: (request: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
    }

    if (url.pathname === '/api/wake' && env.WAKE_URLS) {
      return wakeAll(env.WAKE_URLS)
    }

    if (!env.API_ORIGIN) {
      return Response.json(
        { message: 'API_ORIGIN is not configured for this site.' },
        { status: 500 },
      )
    }

    const target = new URL(env.API_ORIGIN)
    target.pathname = url.pathname.slice('/api'.length) || '/'
    target.search = url.search

    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.set('x-forwarded-host', url.host)
    headers.set('x-forwarded-proto', url.protocol.replace(':', ''))

    const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
    return fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    })
  },
}
