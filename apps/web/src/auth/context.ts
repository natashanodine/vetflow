import { createContext } from 'react'
import type { Session } from '../api/identity'

export interface AuthState {
  session: Session | null
  isLoading: boolean
  /** True while sleeping backend services are being started (can take a minute). */
  isWaking: boolean
  /** Reloads the user and clinic name, e.g. after renaming the clinic. */
  refresh: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthState | null>(null)
