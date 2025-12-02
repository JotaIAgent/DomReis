import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign, Clock, User } from 'lucide-react'

// Helper function to safely parse dates from bot format (DD/MM + HH:mm)
const safeParseDate = (dateString, timeString) => {
    try {
        let year, month, day

        // Handle ISO strings: Extract YYYY-MM-DD directly
        if (dateString && dateString.includes('T')) {
            const [datePart] = dateString.split('T')
            const [y, m, d] = datePart.split('-')
            year = parseInt(y)
            month = parseInt(m)
            day = parseInt(d)
        }
        // Handle YYYY-MM-DD without T
        else if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateString.split('-')
            year = parseInt(y)
            month = parseInt(m)
            day = parseInt(d)
        }
        // Handle DD/MM pattern
        else if (dateString) {
            const match = dateString.match(/(\d{2})\/(\d{2})/)
            if (match) {
                const [_, d, m] = match
                day = parseInt(d)
                month = parseInt(m)
                year = new Date().getFullYear()
            }
        }

        if (year && month && day) {
            const [hours, minutes] = (timeString || '00:00').split(':')
            // Create local date
            const date = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes))
            return isValid(date) ? date : null
        }

        return null
    } catch {
        return null
    }
}

export default function Dashboard() {
    const [metrics, setMetrics] = useState({
        appointmentsCount: 0,
        revenue: 0
    })
    const [appointments, setAppointments] = useState({
        upcoming: []
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            // Fetch ALL appointments
            const { data: allAppointments, error } = await supabase
                .from('dados_agendamentos')
                .select('*')
                .order('id', { ascending: false })

            if (error) throw error

            // Get today's date in DD/MM format (Sao Paulo timezone)
            const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

            // Filter today's appointments
            const todayAppointments = allAppointments?.filter(apt => {
                const date = safeParseDate(apt.Data, apt.Hora)
                if (!date) return false

                const d1 = date.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                const d2 = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

                return d1 === d2
            }) || []

            // Calculate metrics
            const appointmentsCount = todayAppointments.length
            const revenue = todayAppointments.reduce((acc, curr) => {
                const value = curr['Valor serviços']
                if (typeof value === 'string') {
                    return acc + parseFloat(value.replace('R$', '').replace(',', '.').trim()) || 0
                }
                return acc + (Number(value) || 0)
            }, 0)

            setMetrics({
                appointmentsCount,
                revenue
            })

            // Process appointments for the list:
            // 1. Parse dates
            // 2. Filter for future/today
            // 3. Sort by date ascending
            const now = new Date()
            now.setHours(0, 0, 0, 0) // Compare from start of today

            const sortedUpcoming = allAppointments
                ?.map(apt => {
                    const date = safeParseDate(apt.Data, apt.Hora)
                    return { ...apt, parsedDate: date }
                })
                .filter(apt => apt.parsedDate && apt.parsedDate >= now)
                .sort((a, b) => a.parsedDate - b.parsedDate)
                .slice(0, 5) || []

            setAppointments({
                upcoming: sortedUpcoming
            })

        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="text-center p-8 text-gray-400">Carregando dashboard...</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Dashboard</h1>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Agendamentos Hoje</p>
                            <p className="text-3xl font-bold text-white mt-1">{metrics.appointmentsCount}</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-full text-blue-500">
                            <Calendar size={24} />
                        </div>
                    </div>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-400">Faturamento Esperado</p>
                            <p className="text-3xl font-bold text-primary mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.revenue)}
                            </p>
                        </div>
                        <div className="p-3 bg-green-500/10 rounded-full text-green-500">
                            <DollarSign size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Lists */}
            <div className="grid grid-cols-1 gap-6">
                {/* Upcoming */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-dark-700">
                        <h2 className="text-lg font-semibold text-white">Próximos Agendamentos</h2>
                    </div>
                    <div className="divide-y divide-dark-700">
                        {appointments.upcoming.length === 0 ? (
                            <p className="p-4 text-gray-400 text-sm">Nenhum agendamento futuro.</p>
                        ) : (
                            appointments.upcoming.map((apt) => {
                                const date = safeParseDate(apt.Data, apt.Hora)
                                const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) : apt.Data
                                return (
                                    <div key={apt.id || Math.random()} className="p-4 hover:bg-dark-700 transition-colors">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-3">
                                                <div className="bg-dark-900 p-2 rounded-full text-primary">
                                                    <User size={16} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-white">{apt.Cliente}</p>
                                                    <p className="text-xs text-gray-400">{apt.Serviços}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-sm font-bold text-white">{apt.Hora}</p>
                                                <p className="text-xs text-gray-500">{dateStr}</p>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
