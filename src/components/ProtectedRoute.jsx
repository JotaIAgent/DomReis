import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute() {
    const { user, isAdmin, loading } = useAuth()

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900 text-primary">
                Carregando...
            </div>
        )
    }

    if (!user || !isAdmin) {
        return <Navigate to="/login" replace />
    }

    return <Outlet />
}
