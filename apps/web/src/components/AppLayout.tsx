import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/hooks'
import { can, roleLabels } from '../lib/permissions'

const navigation = [
  { label: 'Dashboard', path: '/app/dashboard' },
  { label: 'Agenda', path: '/app/agenda' },
  { label: 'Patients', path: '/app/patients' },
  { label: 'Owners', path: '/app/owners' },
  { label: 'Treatments', path: '/app/treatments' },
]

export default function AppLayout() {
  const { session, isLoading, isWaking, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 px-6 text-center text-slate-500">
        {isWaking ? (
          <div role="status">
            <p className="font-semibold text-slate-700">Starting up the clinic system…</p>
            <p className="mt-2 text-sm">
              After a quiet period this can take up to a minute.
            </p>
          </div>
        ) : (
          'Loading…'
        )}
      </div>
    )
  }
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  const { user, clinic } = session
  const items = can(user.role, 'manageTeam')
    ? [...navigation, { label: 'Team', path: '/app/team' }]
    : navigation

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xl font-bold text-teal-600">Equora</p>
            <p className="text-sm text-slate-500">{clinic.name}</p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-4 py-2 text-sm font-semibold transition',
                    isActive
                      ? 'bg-teal-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/app/account"
              title="My account"
              className="hidden rounded-lg px-2 py-1 text-right transition hover:bg-slate-100 sm:block"
            >
              <span className="block text-sm font-semibold text-slate-800">
                {user.name}
              </span>
              <span className="block text-xs text-slate-500">
                {roleLabels[user.role]} · My account
              </span>
            </Link>
            <button
              type="button"
              onClick={() => {
                // Leave the app first so it doesn't bounce to the login page.
                navigate('/', { replace: true })
                void logout()
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
