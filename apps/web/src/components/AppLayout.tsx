import { NavLink, Outlet } from 'react-router-dom'

const navigation = [
  { label: 'Dashboard', path: '/' },
  { label: 'Agenda', path: '/agenda' },
  { label: 'Patients', path: '/patients' },
  { label: 'Owners', path: '/owners' },
]

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xl font-bold text-teal-600">VetFlow</p>
            <p className="text-sm text-slate-500">
              Veterinary clinic management
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
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
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  )
}
