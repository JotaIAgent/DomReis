import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { BarChart3, Calendar, Users, Globe, Bot } from 'lucide-react'
import { parseDateToLocal } from '../utils/dateUtils'
import clsx from 'clsx'

export default function AIReport() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({
        totalClients: 0,
        byAI: 0,
        bySite: 0,
        aiPerDay: {},
        appointmentsByAI: 0,
        appointmentsBySite: 0,
    })

    // Date filter state
    const [filterType, setFilterType] = useState('all') // 'all', 'last30', 'custom'
    const [customStartDate, setCustomStartDate] = useState('')
    const [customEndDate, setCustomEndDate] = useState('')

    useEffect(() => {
        fetchReportData()
    }, [filterType, customStartDate, customEndDate])

    const fetchReportData = async () => {
        setLoading(true)
        try {
            // Fetch Clients
            const { data: clients, error: clientsError } = await supabase.from('clientes').select('*')
            if (clientsError) throw clientsError

            // Fetch Appointments
            const { data: appointments, error: appointmentsError } = await supabase.from('dados_agendamentos').select('*')
            if (appointmentsError) throw appointmentsError

            processStats(clients || [], appointments || [])
        } catch (error) {
            console.error('Error fetching report data:', error)
        } finally {
            setLoading(false)
        }
    }

    const processStats = (clients, appointments) => {
        let filteredClients = clients
        let filteredAppointments = appointments

        let start = null
        let end = null

        if (filterType === 'last30') {
            end = new Date();
            end.setHours(23, 59, 59, 999);
            start = new Date();
            start.setDate(end.getDate() - 30);
            start.setHours(0, 0, 0, 0);
        } else if (filterType === 'custom' && customStartDate && customEndDate) {
            // customStartDate comes as YYYY-MM-DD from input
            start = parseDateToLocal(customStartDate);
            if (start) start.setHours(0, 0, 0, 0);

            end = parseDateToLocal(customEndDate);
            if (end) end.setHours(23, 59, 59, 999);
        }

        if (start && end) {
            filteredClients = clients.filter(c => {
                const dateObj = parseDateToLocal(c.data);
                return dateObj && dateObj >= start && dateObj <= end;
            })
            filteredAppointments = appointments.filter(a => {
                const dateObj = parseDateToLocal(a.Data); // Note: Appointments use 'Data' (capitalized)
                return dateObj && dateObj >= start && dateObj <= end;
            })
        }

        const totalClients = filteredClients.length
        const byAI = filteredClients.filter(c => c.created_by === 'IA').length
        const bySite = filteredClients.filter(c => c.created_by === 'SITE').length

        // AI per day (using 'data' field) for REGISTRATIONS
        const aiPerDay = filteredClients
            .filter(c => c.created_by === 'IA')
            .reduce((acc, curr) => {
                const date = curr.data || 'Desconhecido'
                acc[date] = (acc[date] || 0) + 1
                return acc
            }, {})

        // Appointments Stats
        const appointmentsByAI = filteredAppointments.filter(a => a.created_by === 'IA').length
        const appointmentsBySite = filteredAppointments.filter(a => a.created_by === 'SITE').length || filteredAppointments.filter(a => a.created_by !== 'IA').length

        setStats({
            totalClients,
            byAI,
            bySite,
            aiPerDay,
            appointmentsByAI,
            appointmentsBySite
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <Bot className="text-primary" />
                    Relatório IA
                </h1>

                <div className="flex flex-wrap items-center gap-2 bg-dark-800 p-2 rounded-lg border border-dark-700">
                    <button
                        onClick={() => { setFilterType('all'); setCustomStartDate(''); setCustomEndDate(''); }}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-dark-600",
                            filterType === 'all' ? "bg-primary text-dark-900 border-primary" : "text-gray-400 hover:text-white bg-dark-900"
                        )}
                    >
                        Tudo
                    </button>
                    <button
                        onClick={() => { setFilterType('last30'); setCustomStartDate(''); setCustomEndDate(''); }}
                        className={clsx(
                            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors border border-dark-600",
                            filterType === 'last30' ? "bg-primary text-dark-900 border-primary" : "text-gray-400 hover:text-white bg-dark-900"
                        )}
                    >
                        Últimos 30 dias
                    </button>

                    <div className="flex items-center gap-2 bg-dark-900 p-1 rounded-md border border-dark-600">
                        <span className="text-xs text-gray-400 pl-2">De:</span>
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => { setCustomStartDate(e.target.value); setFilterType('custom'); }}
                            className="bg-dark-800 text-white text-sm px-2 py-1 rounded border border-dark-700 focus:outline-none focus:border-primary"
                        />
                        <span className="text-xs text-gray-400">Até:</span>
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => { setCustomEndDate(e.target.value); setFilterType('custom'); }}
                            className="bg-dark-800 text-white text-sm px-2 py-1 rounded border border-dark-700 focus:outline-none focus:border-primary"
                        />
                    </div>
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-blue-500/10 rounded-lg">
                            <Users className="text-blue-500" size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-400 bg-dark-900 px-2 py-1 rounded">Total</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{stats.totalClients}</h3>
                    <p className="text-sm text-gray-400">Total de Cadastros</p>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-purple-500/10 rounded-lg">
                            <Bot className="text-purple-500" size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-400 bg-dark-900 px-2 py-1 rounded">IA</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{stats.byAI}</h3>
                    <p className="text-sm text-gray-400">Cadastrados pela IA</p>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-3 bg-green-500/10 rounded-lg">
                            <Globe className="text-green-500" size={24} />
                        </div>
                        <span className="text-xs font-medium text-gray-400 bg-dark-900 px-2 py-1 rounded">Site</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white mb-1">{stats.bySite}</h3>
                    <p className="text-sm text-gray-400">Cadastrados pelo Site</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Appointments by Origin */}
                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Calendar size={20} className="text-primary" />
                        Agendamentos por Origem
                    </h3>
                    <div className="space-y-6">
                        <div className="relative">
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-gray-300 font-medium flex items-center gap-2">
                                    <Bot size={16} className="text-purple-500" />
                                    Agendados pela IA
                                </span>
                                <span className="text-purple-500 font-bold">{stats.appointmentsByAI}</span>
                            </div>
                            <div className="w-full bg-dark-900 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(stats.appointmentsByAI + stats.appointmentsBySite) > 0 ? (stats.appointmentsByAI / (stats.appointmentsByAI + stats.appointmentsBySite)) * 100 : 0}%` }}
                                />
                            </div>
                        </div>

                        <div className="relative">
                            <div className="flex justify-between items-center mb-2 text-sm">
                                <span className="text-gray-300 font-medium flex items-center gap-2">
                                    <Globe size={16} className="text-green-500" />
                                    Agendados pelo Site
                                </span>
                                <span className="text-green-500 font-bold">{stats.appointmentsBySite}</span>
                            </div>
                            <div className="w-full bg-dark-900 h-2 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(stats.appointmentsByAI + stats.appointmentsBySite) > 0 ? (stats.appointmentsBySite / (stats.appointmentsByAI + stats.appointmentsBySite)) * 100 : 0}%` }}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* AI Daily Stats Table */}
                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg flex flex-col">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <BarChart3 size={20} className="text-primary" />
                        Cadastros por Dia (IA)
                    </h3>
                    <div className="flex-1 overflow-y-auto max-h-[300px]">
                        <table className="min-w-full divide-y divide-dark-700">
                            <thead className="bg-dark-900 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Quantidade</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {Object.entries(stats.aiPerDay)
                                    .sort((a, b) => {
                                        // Sort by date DD/MM/YYYY
                                        const [d1, m1, y1] = a[0].split('/').map(Number)
                                        const [d2, m2, y2] = b[0].split('/').map(Number)
                                        return new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)
                                    })
                                    .map(([date, count]) => (
                                        <tr key={date} className="hover:bg-dark-700/50 transition-colors">
                                            <td className="px-4 py-3 text-sm text-gray-300">{date}</td>
                                            <td className="px-4 py-3 text-sm text-primary font-bold text-right">{count}</td>
                                        </tr>
                                    ))}
                                {Object.keys(stats.aiPerDay).length === 0 && (
                                    <tr>
                                        <td colSpan="2" className="px-4 py-8 text-center text-gray-500">
                                            Nenhum cadastro encontrado neste período
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
