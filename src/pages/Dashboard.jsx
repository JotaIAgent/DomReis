import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Calendar, DollarSign, Clock, User } from 'lucide-react'
import { parseDateToLocal, isSameDay } from '../utils/dateUtils'


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

            const today = new Date()

            // Filter today's appointments for count
            const todayAppointments = allAppointments?.filter(apt => {
                const date = parseDateToLocal(apt.Data)
                return isSameDay(date, today)
            }) || []

            // Process ALL upcoming appointments (not finished)
            const now = new Date()
            const sortedUpcoming = allAppointments
                ?.map(apt => {
                    const date = parseDateToLocal(apt.Data)
                    // If we have time, add it to the date object for sorting
                    if (date && apt.Hora) {
                        const [hours, minutes] = apt.Hora.split(':').map(Number)
                        date.setHours(hours, minutes)
                    }
                    return { ...apt, parsedDate: date }
                })
                .filter(apt => apt.parsedDate && apt.parsedDate >= now && !apt.finalizado)
                .sort((a, b) => a.parsedDate - b.parsedDate) || []

            // Calculate projection from ALL upcoming appointments
            const projectedRevenue = sortedUpcoming.reduce((acc, curr) => {
                const value = curr['Valor serviços']
                if (typeof value === 'string') {
                    return acc + parseFloat(value.replace('R$', '').replace(',', '.').trim()) || 0
                }
                return acc + (Number(value) || 0)
            }, 0)

            setMetrics({
                appointmentsCount: sortedUpcoming.length,
                revenue: projectedRevenue
            })

            setAppointments({
                upcoming: sortedUpcoming.slice(0, 10)
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
                            <p className="text-sm text-gray-400">Agendamentos Futuros</p>
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
                            <p className="text-sm text-gray-400">Projeção de Faturamento</p>
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
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-dark-700">
                            <thead className="bg-dark-900">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data/Hora</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Telefone</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Profissional</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Serviços</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {appointments.upcoming.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-4 text-center text-gray-400 text-sm">
                                            Nenhum agendamento futuro.
                                        </td>
                                    </tr>
                                ) : (
                                    appointments.upcoming.map((apt) => {
                                        const date = parseDateToLocal(apt.Data)
                                        const dateStr = date ? date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : apt.Data
                                        return (
                                            <tr key={apt.id || Math.random()} className="hover:bg-dark-700 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-white">{apt.Hora}</span>
                                                        <span className="text-xs text-gray-500">{dateStr}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm font-medium text-white">{apt.Cliente}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-300">{apt.Telefone}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-white">{apt.Profissional || '-'}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="text-sm text-gray-300">{apt.Serviços}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-bold">
                                                    {(() => {
                                                        const val = apt['Valor serviços']
                                                        const num = typeof val === 'string'
                                                            ? parseFloat(val.replace('R$', '').replace(',', '.').trim())
                                                            : Number(val)
                                                        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num || 0)
                                                    })()}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
