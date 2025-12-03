import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, User, Crown, History, UserX, CheckCircle, Phone, CreditCard } from 'lucide-react'
import { parseDateToLocal } from '../utils/dateUtils'
import clsx from 'clsx'

export default function Clients() {
    const [searchTerm, setSearchTerm] = useState('')
    const [clients, setClients] = useState([])
    const [filteredClients, setFilteredClients] = useState([])
    const [selectedClient, setSelectedClient] = useState(null)
    const [clientHistory, setClientHistory] = useState([])
    const [vipStatus, setVipStatus] = useState(null)
    const [loading, setLoading] = useState(false)
    const [loadingDetails, setLoadingDetails] = useState(false)

    // Fetch all clients on mount
    useEffect(() => {
        fetchClients()
    }, [])

    // Filter clients when search term changes
    useEffect(() => {
        if (!clients.length) return

        const term = searchTerm.toLowerCase()
        const filtered = clients.filter(client => {
            const name = client.Nome?.toLowerCase() || ''
            const phone = client.Telefone?.toLowerCase() || ''
            const cpf = client.CPF?.toLowerCase() || ''

            return name.includes(term) || phone.includes(term) || cpf.includes(term)
        })
        setFilteredClients(filtered)
    }, [searchTerm, clients])

    const fetchClients = async () => {
        setLoading(true)
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .order('Nome', { ascending: true })

            if (error) throw error
            setClients(data || [])
            setFilteredClients(data || [])
        } catch (error) {
            console.error('Error fetching clients:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSelectClient = async (client) => {
        setSelectedClient(client)
        setLoadingDetails(true)
        setClientHistory([])
        setVipStatus(null)

        try {
            // 1. Fetch completed appointment history
            // Linking by Telefone as it's the common field
            if (client.Telefone) {
                const { data: history, error: historyError } = await supabase
                    .from('dados_agendamentos')
                    .select('*')
                    .eq('Telefone', client.Telefone)
                    .eq('finalizado', true) // Only completed appointments
                    .order('Data', { ascending: false })

                if (historyError) throw historyError
                setClientHistory(history || [])

                // 2. Check VIP status
                const { data: vip, error: vipError } = await supabase
                    .from('clientes_vips')
                    .select('*')
                    .eq('telefone_cliente', client.Telefone)
                    .single()

                if (vipError && vipError.code !== 'PGRST116') {
                    console.error('Error checking VIP:', vipError)
                }
                setVipStatus(vip || null)
            }
        } catch (error) {
            console.error('Error fetching client details:', error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const totalSpent = clientHistory.reduce((acc, curr) => {
        const value = curr['Valor serviços']
        if (typeof value === 'string') {
            return acc + parseFloat(value.replace('R$', '').replace(',', '.').trim()) || 0
        }
        return acc + (Number(value) || 0)
    }, 0)

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
    }

    return (
        <div className="h-[calc(100vh-theme(spacing.32))] flex flex-col space-y-6">
            <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                <User className="text-primary" />
                Clientes
            </h1>

            {/* Search Bar */}
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 shadow-lg">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-dark-700 rounded-md leading-5 bg-dark-900 text-gray-300 placeholder-gray-500 focus:outline-none focus:bg-dark-900 focus:border-primary focus:ring-primary sm:text-sm"
                        placeholder="Buscar por nome, telefone ou CPF..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-0">
                {/* Client List */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-dark-700 bg-dark-900/50">
                        <h2 className="text-lg font-semibold text-white">Lista de Clientes ({filteredClients.length})</h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {loading ? (
                            <div className="text-center p-4 text-gray-400">Carregando...</div>
                        ) : filteredClients.length === 0 ? (
                            <div className="text-center p-4 text-gray-400">Nenhum cliente encontrado.</div>
                        ) : (
                            filteredClients.map(client => (
                                <button
                                    key={client.id}
                                    onClick={() => handleSelectClient(client)}
                                    className={clsx(
                                        "w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between group",
                                        selectedClient?.id === client.id
                                            ? "bg-primary/10 border border-primary/50"
                                            : "bg-dark-900/50 border border-transparent hover:bg-dark-700"
                                    )}
                                >
                                    <div>
                                        <p className={clsx(
                                            "font-medium",
                                            selectedClient?.id === client.id ? "text-primary" : "text-white"
                                        )}>
                                            {client.Nome || 'Sem Nome'}
                                        </p>
                                        <p className="text-xs text-gray-400">{client.Telefone}</p>
                                    </div>
                                    {selectedClient?.id === client.id && (
                                        <CheckCircle size={16} className="text-primary" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Client Details */}
                <div className="lg:col-span-2 bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden flex flex-col">
                    {selectedClient ? (
                        <div className="flex-1 flex flex-col min-h-0">
                            {/* Header / Summary */}
                            <div className="p-6 border-b border-dark-700 bg-dark-900/30">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">{selectedClient.Nome || 'Cliente sem nome'}</h2>
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                                            <div className="flex items-center gap-1">
                                                <Phone size={14} />
                                                {selectedClient.Telefone || 'Sem telefone'}
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <CreditCard size={14} />
                                                CPF: {selectedClient.CPF || 'Não informado'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {vipStatus && vipStatus.status_assinatura === 'ATIVO' ? (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-primary text-dark-900">
                                                <Crown size={16} className="mr-2" />
                                                VIP
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-dark-700 text-gray-400">
                                                Normal
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                                        <p className="text-sm text-gray-400 mb-1">Total Gasto</p>
                                        <p className="text-2xl font-bold text-primary">
                                            {loadingDetails ? '...' : formatCurrency(totalSpent)}
                                        </p>
                                    </div>
                                    <div className="bg-dark-900 p-4 rounded-lg border border-dark-700">
                                        <p className="text-sm text-gray-400 mb-1">Frequência</p>
                                        <p className="text-2xl font-bold text-white">
                                            {loadingDetails ? '...' : `${clientHistory.length} visitas`}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* History List */}
                            <div className="flex-1 overflow-y-auto p-0">
                                <div className="p-4 border-b border-dark-700 bg-dark-900/50 sticky top-0 backdrop-blur-sm">
                                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <History size={18} />
                                        Histórico de Serviços
                                    </h3>
                                </div>

                                {loadingDetails ? (
                                    <div className="p-8 text-center text-gray-400">Carregando histórico...</div>
                                ) : clientHistory.length === 0 ? (
                                    <div className="p-8 text-center text-gray-400">Nenhum histórico de serviços finalizados.</div>
                                ) : (
                                    <table className="min-w-full divide-y divide-dark-700">
                                        <thead className="bg-dark-900">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Data</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Serviços</th>
                                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Valor</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dark-700 bg-dark-800">
                                            {clientHistory.map((apt) => {
                                                const date = parseDateToLocal(apt.Data)
                                                return (
                                                    <tr key={apt.id} className="hover:bg-dark-700 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                                            <div className="font-medium text-white">
                                                                {date ? date.toLocaleDateString('pt-BR') : apt.Data}
                                                            </div>
                                                            <div className="text-xs text-gray-500">{apt.Hora}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-white">
                                                            {apt.Serviços}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium text-right">
                                                            {apt['Valor serviços']}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 p-8">
                            <User size={48} className="mb-4 opacity-20" />
                            <p className="text-lg">Selecione um cliente para ver os detalhes</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
