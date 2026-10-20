/**
 * Shared fetch helper for the gateway API (served under /api by nginx and the
 * Vite dev proxy). A 401 means the session ended (signed out elsewhere,
 * password changed, account deactivated), so the user is sent to login.
 */
export class ApiError extends Error {
  readonly status: number
  /** Machine-readable reason from the server, e.g. "CLOSED_DAY" or "PAST". */
  readonly code: string | undefined

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
  }
}

function redirectToLogin(reason?: string) {
  const onLoginPage = window.location.pathname === '/login'
  if (!onLoginPage) {
    const query = reason ? `?reason=${encodeURIComponent(reason)}` : ''
    window.location.assign(`/login${query}`)
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: 'same-origin', ...init })

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string
      reason?: string
      code?: string
    } | null

    if (response.status === 401 && body?.reason) {
      redirectToLogin(body.reason)
    }

    throw new ApiError(
      body?.message ?? `Request failed with status ${response.status}`,
      response.status,
      body?.code,
    )
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function jsonRequest(
  method: 'POST' | 'PATCH' | 'PUT',
  body: unknown,
): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}
