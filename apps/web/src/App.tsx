import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/hooks'
import AppLayout from './components/AppLayout'
import PublicLayout from './components/PublicLayout'
import { can } from './lib/permissions'
import AccountPage from './pages/app/AccountPage'
import AgendaPage from './pages/app/AgendaPage'
import DashboardPage from './pages/app/DashboardPage'
import OwnerDetailsPage from './pages/app/OwnerDetailsPage'
import OwnersPage from './pages/app/OwnersPage'
import PatientDetailsPage from './pages/app/PatientDetailsPage'
import PatientsPage from './pages/app/PatientsPage'
import TeamPage from './pages/app/TeamPage'
import LoginPage from './pages/LoginPage'
import HomePage from './pages/public/HomePage'
import ServicesPage from './pages/public/ServicesPage'
import PublicTeamPage from './pages/public/TeamPage'
import TreatmentsPage from './pages/app/TreatmentsPage'
import UnderCarePage from './pages/app/UnderCarePage'

function Dashboard() {
  const { session } = useAuth()
  return <DashboardPage clinicName={session?.clinic.name ?? 'Clinic'} />
}

/** Team management is for admins only; others go back to the dashboard. */
function Team() {
  const { session } = useAuth()
  if (!can(session?.user.role, 'manageTeam')) {
    return <Navigate to="/app/dashboard" replace />
  }
  return <TeamPage clinicName={session?.clinic.name ?? 'Clinic'} />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="team" element={<PublicTeamPage />} />
      </Route>

      <Route path="login" element={<LoginPage />} />

      <Route path="app" element={<AppLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/:patientId" element={<PatientDetailsPage />} />
        <Route path="under-care" element={<UnderCarePage />} />
        <Route path="owners" element={<OwnersPage />} />
        <Route path="owners/:ownerId" element={<OwnerDetailsPage />} />
        <Route path="treatments" element={<TreatmentsPage />} />
        <Route path="team" element={<Team />} />
        <Route path="account" element={<AccountPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
