import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Clients from './pages/Clients'
import Reports from './pages/Reports'
import DailyReport from './pages/DailyReport'
import Sales from './pages/Sales'
import Financial from './pages/Financial'
import Settings from './pages/Settings'
import AIReport from './pages/AIReport'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agendamentos" element={<Appointments />} />
              <Route path="/clientes" element={<Clients />} />
              <Route path="/venda" element={<Sales />} />
              <Route path="/financeiro" element={<Financial />} />
              <Route path="/valores" element={<Settings />} />
              <Route path="/relatorios" element={<Reports />} />
              <Route path="/relatorios/:date" element={<DailyReport />} />
              <Route path="/relatorio-ia" element={<AIReport />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
