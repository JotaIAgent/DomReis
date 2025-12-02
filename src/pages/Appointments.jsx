import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, startOfDay, endOfDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, CheckCircle, Circle, Phone, Scissors } from 'lucide-react'
import NewAppointmentModal from '../components/NewAppointmentModal'
import clsx from 'clsx'

export default function Appointments() {
    const [appointments, setAppointments] = useState([])
    const [loading, setLoading] = useState(true)
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [completedIds, setCompletedIds] = useState(new Set())

    useEffect(() => {
        fetchAppointments()

        // Real-time subscription
        const channel = supabase
            .channel('appointments_channel')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'dados_agendamentos'
                },
                () => {
                    fetchAppointments()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchAppointments = async () => {
        try {
            // Get today's date in DD/MM format to match bot format
            const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })

            // Fetch all appointments and filter by today's date
            const { data, error } = await supabase
                .from('dados_agendamentos')
                .select('*')
                .order('Hora', { ascending: true })

            if (error) throw error

            // Filter appointments for today
            const todayAppointments = data?.filter(apt => {
                if (!apt.Data) return false

                let aptDate = apt.Data
                // If it's an ISO string (from manual entry), convert to DD/MM
                if (apt.Data.includes('T') || apt.Data.includes('-')) {
                    const dateObj = new Date(apt.Data)
                    if (!isNaN(dateObj.getTime())) {
                        aptDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' })
                    }
                }

                // Clean up potential "Segunda, 01/12" formats
                const match = aptDate.match(/(\d{2})\/(\d{2})/)
                if (match) {
                    aptDate = `${match[1]}/${match[2]}`
                }

                return aptDate === today
            }) || []
            setAppointments(todayAppointments)
        } catch (error) {
            console.error('Error fetching appointments:', error)
        } finally {
            setLoading(false)
        }
    }

    const toggleComplete = (id) => {
        const newCompleted = new Set(completedIds)
        if (newCompleted.has(id)) {
            newCompleted.delete(id)
        } else {
            newCompleted.add(id)
        }
        setCompletedIds(newCompleted)
    }

    if (loading) {
        return <div className="text-center p-8 text-gray-400">Carregando agendamentos...</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary">Agendamentos de Hoje</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-primary text-dark-900 rounded-md font-bold hover:bg-yellow-500 transition-colors"
                >
                    <Plus size={20} className="mr-2" />
                    Novo Agendamento
                </button>
            </div>

            <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-dark-700">
                        <thead className="bg-dark-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Hora</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Profissional</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Serviços</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                            {appointments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                                        Nenhum agendamento para hoje.
                                    </td>
                                </tr>
                            ) : (
                                appointments.map((apt) => {
                                    const isCompleted = completedIds.has(apt.id) // Assuming 'id' exists, if not we might need another key
                                    // If 'id' is not in the schema provided in prompt, we might need to rely on something else or assume Supabase adds 'id' by default (which it usually does for tables)
                                    // The prompt didn't explicitly list 'id' for 'dados_agendamentos', but it's standard. If not, we might have issues.
                                    // Let's assume there is an ID or use a combination of fields.
                                    const rowKey = apt.id || `${apt.Data}-${apt.Cliente}`

                                    return (
                                        <tr key={rowKey} className={clsx("hover:bg-dark-700 transition-colors", isCompleted && "bg-dark-900/50 opacity-50")}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => toggleComplete(apt.id)} // Assuming ID exists
                                                    className={clsx(
                                                        "focus:outline-none transition-colors",
                                                        isCompleted ? "text-green-500" : "text-gray-500 hover:text-gray-300"
                                                    )}
                                                >
                                                    {isCompleted ? <CheckCircle size={24} /> : <Circle size={24} />}
                                                </button>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                                                {apt.Hora}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-white font-medium">{apt.Cliente}</span>
                                                    <span className="text-xs text-gray-500 flex items-center mt-1">
                                                        <Phone size={12} className="mr-1" />
                                                        {apt.Telefone}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-white font-medium">{apt.Profissional || '-'}</span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="text-sm text-gray-300 flex items-center">
                                                    <Scissors size={14} className="mr-2 text-primary" />
                                                    {apt.Serviços}
                                                </span>
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

            <NewAppointmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchAppointments}
            />
        </div>
    )
}
