/**
 * Cloudflare Worker for the Equora website.
 *
 * Static files (the built React app) are served by Cloudflare directly. Only
 * requests to /api/* reach this code; they are forwarded to the backend
 * gateway on Render (API_ORIGIN), with the /api prefix removed, just like
 * nginx does in Docker. Because the browser only ever talks to this one
 * site, sign-in cookies work without any cross-site setup.
 */
export default {
  /**
   * @param {Request} request
   * @param {{ API_ORIGIN?: string, ASSETS: { fetch: (request: Request) => Promise<Response> } }} env
   */
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname !== '/api' && !url.pathname.startsWith('/api/')) {
      return env.ASSETS.fetch(request)
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
