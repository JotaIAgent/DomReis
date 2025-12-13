import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import {
    LayoutDashboard,
    Calendar,
    Users,
    Crown,
    DollarSign,
    LogOut,
    Menu,
    X,
    BarChart3,
    ShoppingCart,
    Settings,
    Bot
} from 'lucide-react'
import clsx from 'clsx'

export default function Layout() {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const { signOut } = useAuth()
    const location = useLocation()

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Agendamentos', href: '/agendamentos', icon: Calendar },
        { name: 'Clientes', href: '/clientes', icon: Users },
        { name: 'Venda', href: '/venda', icon: ShoppingCart },
        { name: 'Financeiro', href: '/financeiro', icon: DollarSign },
        { name: 'Valores', href: '/valores', icon: Settings },
        { name: 'Relatórios', href: '/relatorios', icon: BarChart3 },
        { name: 'Relatório IA', href: '/relatorio-ia', icon: Bot },
    ]

    return (
        <div className="min-h-screen bg-dark-900 flex">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={clsx(
                "fixed inset-y-0 left-0 z-50 w-64 bg-dark-800 border-r border-dark-700 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-dark-700">
                    <span className="text-xl font-bold text-primary">Dom Reis</span>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden text-gray-400 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={clsx(
                                    isActive
                                        ? 'bg-dark-700 text-primary'
                                        : 'text-gray-300 hover:bg-dark-700 hover:text-white',
                                    'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                                )}
                            >
                                <item.icon
                                    className={clsx(
                                        isActive ? 'text-primary' : 'text-gray-400 group-hover:text-white',
                                        'mr-3 flex-shrink-0 h-6 w-6 transition-colors'
                                    )}
                                />
                                {item.name}
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-dark-700">
                    <button
                        onClick={() => signOut()}
                        className="flex items-center w-full px-2 py-2 text-sm font-medium text-red-400 hover:bg-dark-700 hover:text-red-300 rounded-md transition-colors"
                    >
                        <LogOut className="mr-3 h-6 w-6" />
                        Sair
                    </button>
                </div>
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile header */}
                <div className="lg:hidden flex items-center justify-between bg-dark-800 border-b border-dark-700 px-4 py-2">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="text-gray-400 hover:text-white focus:outline-none"
                    >
                        <Menu size={24} />
                    </button>
                    <span className="text-lg font-bold text-primary">Dom Reis</span>
                    <div className="w-6" /> {/* Spacer for centering */}
                </div>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
