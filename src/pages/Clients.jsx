import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, User, Crown, History, UserX, CheckCircle, Phone, CreditCard, Edit3, X, UserPlus } from 'lucide-react'
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
    const [showEditModal, setShowEditModal] = useState(false)
    const [editForm, setEditForm] = useState({ Nome: '', Telefone: '', CPF: '' })
    const [showNewClientModal, setShowNewClientModal] = useState(false)
    const [newClientForm, setNewClientForm] = useState({ Nome: '', Telefone: '', CPF: '' })

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

                // 3. Fetch Sales Transactions
                const { data: transactions, error: txError } = await supabase
                    .from('transacoes_financeiras')
                    .select('*')
                    .ilike('descricao', `%${client.Nome}%`)
                    .order('data', { ascending: false })

                if (txError) console.error('Error fetching transactions:', txError)

                // Merge and sort history
                const combinedHistory = [
                    ...(history || []).map(h => ({ ...h, type: 'appointment' })),
                    ...(transactions || []).map(t => ({
                        id: t.id,
                        Data: t.data, // Map to same key for sorting
                        Hora: '-',
                        Serviços: t.descricao,
                        'Valor serviços': t.valor,
                        type: 'sale'
                    }))
                ].sort((a, b) => new Date(b.Data) - new Date(a.Data))

                setClientHistory(combinedHistory)

                // 2. Check VIP status
                const { data: vip, error: vipError } = await supabase
                    .from('clientes_vips')
                    .select('*')
                    .eq('telefone_cliente', client.Telefone)
                setVipStatus(vip || null)
            }
        } catch (error) {
            console.error('Error fetching client details:', error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const toggleValidation = async () => {
        if (!selectedClient) return

        try {
            const newValue = !selectedClient.Validado
            const { error } = await supabase
                .from('clientes')
                .update({ Validado: newValue })
                .eq('id', selectedClient.id)

            if (error) throw error

            // Update local state
            const updatedClient = { ...selectedClient, Validado: newValue }
            setSelectedClient(updatedClient)
            setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c))
            setFilteredClients(filteredClients.map(c => c.id === updatedClient.id ? updatedClient : c))

        } catch (error) {
            console.error('Error updating validation:', error)
            alert('Erro ao atualizar validação')
        }
    }

    const toggleVIP = async () => {
        if (!selectedClient) return

        const isCurrentlyVIP = vipStatus && vipStatus.length > 0 && vipStatus[0].status_assinatura === 'ATIVO'

        try {
            if (isCurrentlyVIP) {
                // Deactivate VIP
                const { error } = await supabase
                    .from('clientes_vips')
                    .update({ status_assinatura: 'INATIVO' })
                    .eq('telefone_cliente', selectedClient.Telefone)

                if (error) throw error

                // Update local state
                setVipStatus([{ ...vipStatus[0], status_assinatura: 'INATIVO' }])
                alert('VIP desativado com sucesso!')
            } else {
                // Activate or create VIP record
                // Calculate expiration date (1 month from now)
                const now = new Date()
                const expDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate())
                const activationDate = now.toLocaleDateString('pt-BR')
                const expirationDate = expDate.toLocaleDateString('pt-BR')

                if (vipStatus && vipStatus.length > 0) {
                    // Reactivate existing VIP
                    const { error } = await supabase
                        .from('clientes_vips')
                        .update({
                            status_assinatura: 'ATIVO',
                            data_ativacao: activationDate,
                            data_expiracao: expirationDate
                        })
                        .eq('telefone_cliente', selectedClient.Telefone)

                    if (error) throw error

                    setVipStatus([{
                        ...vipStatus[0],
                        status_assinatura: 'ATIVO',
                        data_ativacao: activationDate,
                        data_expiracao: expirationDate
                    }])
                } else {
                    // Create new VIP record
                    const { data, error } = await supabase
                        .from('clientes_vips')
                        .insert([{
                            cpf_cliente: selectedClient.CPF || '',
                            telefone_cliente: selectedClient.Telefone,
                            nome_cliente: selectedClient.Nome,
                            status_assinatura: 'ATIVO',
                            data_ativacao: activationDate,
                            data_expiracao: expirationDate,
                            valor_mensalidade: '64.99'
                        }])
                        .select()

                    if (error) throw error

                    setVipStatus(data)
                }
                alert('VIP ativado com sucesso!')
            }
        } catch (error) {
            console.error('Error updating VIP status:', error)
            alert('Erro ao atualizar status VIP')
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

    const openEditModal = () => {
        if (!selectedClient) return
        setEditForm({
            Nome: selectedClient.Nome || '',
            Telefone: selectedClient.Telefone || '',
            CPF: selectedClient.CPF || ''
        })
        setShowEditModal(true)
    }

    const saveClientEdit = async () => {
        if (!selectedClient) return

        try {
            const { error } = await supabase
                .from('clientes')
                .update({
                    Nome: editForm.Nome,
                    Telefone: editForm.Telefone,
                    CPF: editForm.CPF
                })
                .eq('id', selectedClient.id)

            if (error) throw error

            // Update local state
            const updatedClient = { ...selectedClient, ...editForm }
            setSelectedClient(updatedClient)
            setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c))
            setFilteredClients(filteredClients.map(c => c.id === updatedClient.id ? updatedClient : c))

            setShowEditModal(false)
            alert('Cliente atualizado com sucesso!')
        } catch (error) {
            console.error('Error updating client:', error)
            alert('Erro ao atualizar cliente')
        }
    }

    const createNewClient = async () => {
        if (!newClientForm.Nome || !newClientForm.Telefone) {
            alert('Nome e Telefone são obrigatórios')
            return
        }

        try {
            const { data, error } = await supabase
                .from('clientes')
                .insert([{
                    Nome: newClientForm.Nome,
                    Telefone: newClientForm.Telefone,
                    CPF: newClientForm.CPF || null
                }])
                .select()
                .single()

            if (error) throw error

            // Update local state
            setClients([...clients, data])
            setFilteredClients([...filteredClients, data])
            setSelectedClient(data)

            setShowNewClientModal(false)
            setNewClientForm({ Nome: '', Telefone: '', CPF: '' })
            alert('Cliente cadastrado com sucesso!')
        } catch (error) {
            console.error('Error creating client:', error)
            alert('Erro ao cadastrar cliente')
        }
    }

    return (
        <div className="h-[calc(100vh-theme(spacing.32))] flex flex-col space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
                    <User className="text-primary" />
                    Clientes
                </h1>
                <button
                    onClick={() => setShowNewClientModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-dark-900 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
                >
                    <UserPlus size={20} />
                    Novo Cliente
                </button>
            </div>

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
                                        <button
                                            onClick={toggleValidation}
                                            className={clsx(
                                                "px-3 py-1 rounded-full text-sm font-bold transition-colors",
                                                selectedClient.Validado
                                                    ? "bg-green-500/20 text-green-500 hover:bg-green-500/30"
                                                    : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                                            )}
                                        >
                                            {selectedClient.Validado ? 'Validado' : 'Validar'}
                                        </button>

                                        {vipStatus && vipStatus.length > 0 && vipStatus[0].status_assinatura === 'ATIVO' ? (
                                            <button
                                                onClick={toggleVIP}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-primary text-dark-900 hover:bg-yellow-500 transition-colors cursor-pointer"
                                                title="Clique para desativar VIP"
                                            >
                                                <Crown size={16} className="mr-2" />
                                                VIP
                                            </button>
                                        ) : (
                                            <button
                                                onClick={toggleVIP}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-dark-700 text-gray-400 hover:bg-dark-600 transition-colors cursor-pointer"
                                                title="Clique para ativar VIP"
                                            >
                                                <Crown size={16} className="mr-2" />
                                                Ativar VIP
                                            </button>
                                        )}

                                        <button
                                            onClick={openEditModal}
                                            className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors"
                                            title="Editar dados do cliente"
                                        >
                                            <Edit3 size={16} className="mr-2" />
                                            Editar
                                        </button>
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
                                            {loadingDetails ? '...' : `${clientHistory.filter(h => h.type === 'appointment').length} visitas`}
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

            {/* Edit Client Modal */}
            {showEditModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Editar Cliente</h2>
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={editForm.Nome}
                                    onChange={e => setEditForm({ ...editForm, Nome: e.target.value })}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Telefone</label>
                                <input
                                    type="text"
                                    value={editForm.Telefone}
                                    onChange={e => setEditForm({ ...editForm, Telefone: e.target.value })}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={editForm.CPF}
                                    onChange={e => setEditForm({ ...editForm, CPF: e.target.value })}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowEditModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveClientEdit}
                                className="px-4 py-2 bg-primary text-dark-900 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
                            >
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* New Client Modal */}
            {showNewClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Novo Cliente</h2>
                            <button
                                onClick={() => setShowNewClientModal(false)}
                                className="text-gray-400 hover:text-white"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Nome *</label>
                                <input
                                    type="text"
                                    value={newClientForm.Nome}
                                    onChange={e => setNewClientForm({ ...newClientForm, Nome: e.target.value })}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                    placeholder="Nome completo"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Telefone *</label>
                                <input
                                    type="text"
                                    value={newClientForm.Telefone}
                                    onChange={e => setNewClientForm({ ...newClientForm, Telefone: e.target.value })}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                    placeholder="(00) 00000-0000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">CPF</label>
                                <input
                                    type="text"
                                    value={newClientForm.CPF}
                                    onChange={e => setNewClientForm({ ...newClientForm, CPF: e.target.value })}
                                    className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary"
                                    placeholder="000.000.000-00"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowNewClientModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={createNewClient}
                                className="px-4 py-2 bg-primary text-dark-900 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
                            >
                                Cadastrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
