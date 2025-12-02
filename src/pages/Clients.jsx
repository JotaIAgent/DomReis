import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Crown, History, UserX } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import MakeVIPModal from '../components/MakeVIPModal'

export default function Clients() {
    const [phoneSearch, setPhoneSearch] = useState('')
    const [clientData, setClientData] = useState(null)
    const [history, setHistory] = useState([])
    const [vipStatus, setVipStatus] = useState(null)
    const [loading, setLoading] = useState(false)
    const [isVIPModalOpen, setIsVIPModalOpen] = useState(false)

    const handleSearch = async (e) => {
        e.preventDefault()
        if (!phoneSearch) return

        setLoading(true)
        setClientData(null)
        setHistory([])
        setVipStatus(null)

        try {
            // 1. Fetch history from appointments
            const { data: appointments, error: aptError } = await supabase
                .from('dados_agendamentos')
                .select('*')
                .eq('Telefone', phoneSearch)
                .order('Data', { ascending: false })

            if (aptError) throw aptError

            if (appointments.length > 0) {
                setHistory(appointments)
                // Assume client name from the most recent appointment
                const name = appointments[0].Cliente
                setClientData({ name, phone: phoneSearch })

                // 2. Check VIP status
                const { data: vip, error: vipError } = await supabase
                    .from('clientes_vips')
                    .select('*')
                    .eq('telefone_cliente', phoneSearch)
                    .single()

                if (vipError && vipError.code !== 'PGRST116') { // PGRST116 is "no rows found"
                    console.error('Error checking VIP:', vipError)
                }

                setVipStatus(vip || null)
            } else {
                setClientData(null) // Not found
            }

        } catch (error) {
            console.error('Error searching client:', error)
        } finally {
            setLoading(false)
        }
    }

    const totalSpent = history.reduce((acc, curr) => {
        const value = curr['Valor serviços']
        if (typeof value === 'string') {
            return acc + parseFloat(value.replace('R$', '').replace(',', '.').trim()) || 0
        }
        return acc + (Number(value) || 0)
    }, 0)

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary">Frequência de Clientes</h1>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label htmlFor="phone" className="sr-only">Telefone</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="tel"
                                name="phone"
                                id="phone"
                                className="block w-full pl-10 pr-3 py-2 border border-dark-700 rounded-md leading-5 bg-dark-900 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-dark-900 focus:border-primary focus:ring-primary sm:text-sm"
                                placeholder="Buscar por telefone (ex: 11999999999)"
                                value={phoneSearch}
                                onChange={(e) => setPhoneSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-dark-900 bg-primary hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                    >
                        {loading ? 'Buscando...' : 'Buscar'}
                    </button>
                </div>
            </form>

            {/* Results */}
            {clientData ? (
                <div className="space-y-6">
                    {/* Client Info Card */}
                    <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-white">{clientData.name}</h2>
                                <p className="text-gray-400">{clientData.phone}</p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <p className="text-sm text-gray-400">Total Gasto</p>
                                    <p className="text-xl font-bold text-primary">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSpent)}
                                    </p>
                                </div>
                                <div className="text-right border-l border-dark-700 pl-4">
                                    <p className="text-sm text-gray-400">Visitas</p>
                                    <p className="text-xl font-bold text-white">{history.length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex items-center justify-between border-t border-dark-700 pt-4">
                            <div className="flex items-center">
                                {vipStatus && vipStatus.status_assinatura === 'ATIVO' ? (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary/20 text-primary">
                                        <Crown size={16} className="mr-2" />
                                        VIP Ativo
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-700 text-gray-300">
                                        <UserX size={16} className="mr-2" />
                                        Não VIP
                                    </span>
                                )}
                            </div>

                            {(!vipStatus || vipStatus.status_assinatura !== 'ATIVO') && (
                                <button
                                    onClick={() => setIsVIPModalOpen(true)}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary bg-primary/10 hover:bg-primary/20 focus:outline-none"
                                >
                                    <Crown size={16} className="mr-2" />
                                    Tornar VIP
                                </button>
                            )}
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
                        <div className="p-4 border-b border-dark-700 flex items-center">
                            <History size={20} className="text-gray-400 mr-2" />
                            <h3 className="text-lg font-semibold text-white">Histórico de Agendamentos</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-dark-700">
                                <thead className="bg-dark-900">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Serviços</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-700">
                                    {history.map((apt) => (
                                        <tr key={apt.id || Math.random()} className="hover:bg-dark-700 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                {apt.Data} {apt.Hora}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                                                {apt.Serviços}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium">
                                                {apt['Valor serviços']}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                phoneSearch && !loading && (
                    <div className="text-center p-8 text-gray-400 bg-dark-800 rounded-xl border border-dark-700">
                        Nenhum cliente encontrado com este telefone.
                    </div>
                )
            )}

            {clientData && (
                <MakeVIPModal
                    isOpen={isVIPModalOpen}
                    onClose={() => setIsVIPModalOpen(false)}
                    clientData={clientData}
                    onSuccess={() => handleSearch({ preventDefault: () => { } })} // Refresh data
                />
            )}
        </div>
    )
}
