import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AgendaPage from './pages/AgendaPage'
import DashboardPage from './pages/DashboardPage'
import OwnerDetailsPage from './pages/OwnerDetailsPage'
import OwnersPage from './pages/OwnersPage'
import PatientDetailsPage from './pages/PatientDetailsPage'
import PatientsPage from './pages/PatientsPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="agenda" element={<AgendaPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route
          path="patients/:patientId"
          element={<PatientDetailsPage />}
        />
        <Route path="owners" element={<OwnersPage />} />
        <Route
          path="owners/:ownerId"
          element={<OwnerDetailsPage />}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
