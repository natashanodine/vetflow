import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import {
  getSession,
  logout as logoutRequest,
  wakeServices,
  type Session,
} from '../api/identity'
import { AuthContext } from './context'

/** Show the "starting up" message only when waking takes noticeably long. */
const SLOW_START_MS = 2_500

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isWaking, setIsWaking] = useState(false)
  const startedRef = useRef(false)
  const location = useLocation()

  // The public website never needs the backend, so visitors there don't wake
  // the (possibly sleeping) services. Only the login page and the app do.
  const needsSession =
    location.pathname === '/login' || location.pathname.startsWith('/app')

  const refresh = useCallback(async () => {
    try {
      setSession(await getSession())
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!needsSession || startedRef.current) return
    startedRef.current = true

    const slowStart = setTimeout(() => setIsWaking(true), SLOW_START_MS)
    void (async () => {
      await wakeServices()
      clearTimeout(slowStart)
      setIsWaking(false)
      await refresh().catch(() => undefined)
    })()
  }, [needsSession, refresh])

  const logout = useCallback(async () => {
    await logoutRequest().catch(() => undefined)
    setSession(null)
  }, [])

  return (
    <AuthContext.Provider value={{ session, isLoading, isWaking, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
