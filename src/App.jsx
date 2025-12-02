import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Clients from './pages/Clients'
import VIPs from './pages/VIPs'
import Financial from './pages/Financial'
import Reports from './pages/Reports'
import DailyReport from './pages/DailyReport'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agendamentos" element={<Appointments />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/vips" element={<VIPs />} />
              <Route path="/financeiro" element={<Financial />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/relatorios/:date" element={<DailyReport />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
