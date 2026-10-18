import { useContext } from 'react'
import { can, type Permission } from '../lib/permissions'
import { AuthContext } from './context'

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

/** The signed-in user (for "is this me?" checks). */
export function useViewer() {
  const user = useAuth().session?.user
  return user ? { userId: user.id, role: user.role } : null
}

/** Hides actions in the UI; the services enforce the same rules. */
export function useCan(permission: Permission) {
  return can(useAuth().session?.user.role, permission)
}
