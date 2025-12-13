import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { X, Crown, Search, ChevronDown, Check, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function NewAppointmentModal({ isOpen, onClose, onSuccess }) {
    const { user } = useAuth()
    const [formData, setFormData] = useState({
        cliente: '',
        telefone: '',
        servicos: '',
        profissional: '',
        data: '',
        hora: '',
        valor: ''
    })
    const [loading, setLoading] = useState(false)
    const [services, setServices] = useState([])
    const [clients, setClients] = useState([])
    const [isVip, setIsVip] = useState(false)
    const [isValidated, setIsValidated] = useState(false)
    const [discount, setDiscount] = useState(0)

    // Client Search State
    const [clientSearch, setClientSearch] = useState('')
    const [showClientDropdown, setShowClientDropdown] = useState(false)
    const [filteredClients, setFilteredClients] = useState([])

    // Service Dropdown State
    const [showServiceDropdown, setShowServiceDropdown] = useState(false)
    const serviceDropdownRef = useRef(null)

    // New Client Modal State
    const [showNewClientModal, setShowNewClientModal] = useState(false)
    const [newClientForm, setNewClientForm] = useState({ Nome: '', Telefone: '', CPF: '' })

    // Fetch services and clients on mount
    useEffect(() => {
        if (isOpen) {
            fetchServices()
            fetchClients()
        }
    }, [isOpen])

    // Close service dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(event.target)) {
                setShowServiceDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const fetchServices = async () => {
        try {
            const { data, error } = await supabase
                .from('services')
                .select('*')
                .eq('active', true)
                .order('name')

            if (error) throw error
            setServices(data || [])
        } catch (error) {
            console.error('Error fetching services:', error)
            setServices([])
        }
    }

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .order('Nome')

            if (error) throw error
            setClients(data || [])
        } catch (error) {
            console.error('Error fetching clients:', error)
        }
    }

    // Filter clients based on search
    useEffect(() => {
        if (!clientSearch) {
            setFilteredClients([])
            return
        }
        const lowerSearch = clientSearch.toLowerCase()
        const filtered = clients.filter(client =>
            client.Nome?.toLowerCase().includes(lowerSearch) ||
            client.CPF?.includes(lowerSearch) ||
            client.Telefone?.includes(lowerSearch)
        )
        setFilteredClients(filtered)
    }, [clientSearch, clients])

    // Calculate total whenever services, vip status, or discount changes
    useEffect(() => {
        calculateTotal()
    }, [formData.servicos, isVip, discount, services])

    const calculateTotal = () => {
        const selectedServiceNames = formData.servicos ? formData.servicos.split(', ').filter(Boolean) : []

        let total = selectedServiceNames.reduce((acc, serviceName) => {
            const service = services.find(s => s.name === serviceName)
            if (!service) return acc

            // VIP Logic: 'Cabelo' is free
            if (isVip && service.name === 'Cabelo') {
                return acc
            }

            return acc + Number(service.price)
        }, 0)

        // Subtract discount
        total = Math.max(0, total - discount)

        setFormData(prev => ({ ...prev, valor: total.toFixed(2) }))
    }

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (!formData.servicos) {
            alert('Por favor, selecione pelo menos um serviço.')
            return
        }

        setLoading(true)

        try {
            // Format date to DD/MM/YYYY
            const [year, month, day] = formData.data.split('-')
            const formattedDate = `${day}/${month}/${year}`

            const { error } = await supabase
                .from('dados_agendamentos')
                .insert([{
                    Profissional: formData.profissional,
                    Serviços: formData.servicos,
                    Data: formattedDate,
                    Hora: formData.hora,
                    Cliente: formData.cliente,
                    Telefone: formData.telefone,
                    'Valor serviços': parseFloat(formData.valor),
                    created_by: 'SITE'
                }])

            if (error) throw error

            onSuccess()
            handleClose()
        } catch (error) {
            console.error('Error creating appointment:', error)
            alert('Erro ao criar agendamento')
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        setFormData({
            cliente: '',
            telefone: '',
            servicos: '',
            profissional: '',
            data: '',
            hora: '',
            valor: ''
        })
        setClientSearch('')
        setIsVip(false)
        setDiscount(0)
        onClose()
    }

    const toggleService = (serviceName) => {
        const currentServices = formData.servicos ? formData.servicos.split(', ').filter(Boolean) : []
        const isSelected = currentServices.includes(serviceName)

        let newServices
        if (isSelected) {
            newServices = currentServices.filter(s => s !== serviceName)
        } else {
            newServices = [...currentServices, serviceName]
        }

        setFormData({ ...formData, servicos: newServices.join(', ') })
    }

    const selectClient = async (client) => {
        setFormData({
            ...formData,
            cliente: client.Nome,
            telefone: client.Telefone || ''
        })
        setClientSearch(client.Nome)
        setShowClientDropdown(false)
        setIsValidated(client.Validado === true || client.Validado === 'true')

        // Check VIP status
        if (client.Telefone) {
            try {
                const { data: vip, error } = await supabase
                    .from('clientes_vips')
                    .select('*')
                    .eq('telefone_cliente', client.Telefone)
                    .single()

                if (vip && vip.status_assinatura === 'ATIVO') {
                    setIsVip(true)
                } else {
                    setIsVip(false)
                }
            } catch (error) {
                console.error('Error checking VIP status:', error)
                setIsVip(false)
            }
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

            // Update clients list and select the new client
            setClients([...clients, data])
            selectClient(data)

            setShowNewClientModal(false)
            setNewClientForm({ Nome: '', Telefone: '', CPF: '' })
            alert('Cliente cadastrado com sucesso!')
        } catch (error) {
            console.error('Error creating client:', error)
            alert('Erro ao cadastrar cliente')
        }
    }

    const selectedServicesList = formData.servicos ? formData.servicos.split(', ').filter(Boolean) : []

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-dark-700 sticky top-0 bg-dark-800 z-10">
                    <h2 className="text-lg font-bold text-white">Novo Agendamento</h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Client Search */}
                    <div className="relative">
                        <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                className="w-full bg-dark-900 border border-dark-700 rounded-md pl-3 pr-10 py-2 text-white focus:outline-none focus:border-primary"
                                value={clientSearch}
                                onChange={e => {
                                    setClientSearch(e.target.value)
                                    setFormData({ ...formData, cliente: e.target.value })
                                    setShowClientDropdown(true)
                                }}
                                onFocus={() => setShowClientDropdown(true)}
                                placeholder="Nome, CPF ou Telefone"
                            />
                            <Search className="absolute right-3 top-2.5 text-gray-500" size={18} />
                        </div>

                        {showClientDropdown && clientSearch && (
                            <div className="absolute top-full left-0 right-0 bg-dark-900 border border-dark-700 rounded-b-md shadow-xl z-20 max-h-48 overflow-y-auto mt-1">
                                {filteredClients.length > 0 ? (
                                    <>
                                        {filteredClients.map(client => (
                                            <div
                                                key={client.id}
                                                onClick={() => selectClient(client)}
                                                className="p-2 hover:bg-dark-800 cursor-pointer text-sm border-b border-dark-800 last:border-0"
                                            >
                                                <div className="font-bold text-white">{client.Nome}</div>
                                                <div className="text-xs text-gray-400">
                                                    {client.Telefone && <span>{client.Telefone}</span>}
                                                    {client.CPF && <span className="ml-2">CPF: {client.CPF}</span>}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowClientDropdown(false)
                                                setShowNewClientModal(true)
                                            }}
                                            className="w-full p-2 text-left text-primary hover:bg-dark-800 text-sm font-bold border-t border-dark-700 flex items-center gap-2"
                                        >
                                            <UserPlus size={16} />
                                            Cadastrar Novo Cliente
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowClientDropdown(false)
                                            setShowNewClientModal(true)
                                        }}
                                        className="w-full p-3 text-center text-primary hover:bg-dark-800 text-sm font-bold flex items-center justify-center gap-2"
                                    >
                                        <UserPlus size={16} />
                                        Cliente não encontrado. Cadastrar novo?
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Telefone</label>
                        <input
                            type="tel"
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            value={formData.telefone}
                            onChange={e => setFormData({ ...formData, telefone: e.target.value })}
                        />
                    </div>

                    {/* Service Selection */}
                    <div ref={serviceDropdownRef}>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-400">Serviços</label>
                            <button
                                type="button"
                                onClick={() => setIsVip(!isVip)}
                                className={`flex items-center px-3 py-1 rounded-full text-xs font-bold transition-colors ${isVip
                                    ? 'bg-primary text-dark-900'
                                    : 'bg-dark-700 text-gray-400 hover:bg-dark-600'
                                    }`}
                            >
                                <Crown size={14} className="mr-1" />
                                {isVip ? 'VIP ATIVO' : 'ATIVAR VIP'}
                            </button>
                        </div>

                        {/* Selected Services Tags */}
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedServicesList.map(serviceName => (
                                <span key={serviceName} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/20 text-primary border border-primary/30">
                                    {serviceName}
                                    <button
                                        type="button"
                                        onClick={() => toggleService(serviceName)}
                                        className="ml-1 hover:text-white"
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Service Dropdown */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowServiceDropdown(!showServiceDropdown)}
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-left text-gray-300 focus:outline-none focus:border-primary flex justify-between items-center"
                            >
                                <span>Selecionar serviços...</span>
                                <ChevronDown size={18} />
                            </button>

                            {showServiceDropdown && (
                                <div className="absolute top-full left-0 right-0 bg-dark-900 border border-dark-700 rounded-b-md shadow-xl z-20 max-h-60 overflow-y-auto mt-1">
                                    {services.map(service => (
                                        <div
                                            key={service.id}
                                            onClick={() => toggleService(service.name)}
                                            className="p-2 hover:bg-dark-800 cursor-pointer text-sm flex justify-between items-center border-b border-dark-800 last:border-0"
                                        >
                                            <div className="text-white">
                                                {service.name}
                                                <span className="ml-2 text-xs text-gray-500">R$ {service.price}</span>
                                            </div>
                                            {selectedServicesList.includes(service.name) && (
                                                <Check size={16} className="text-primary" />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        {formData.servicos === '' && <p className="text-xs text-red-500 mt-1">Selecione pelo menos um serviço</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Barbeiro</label>
                        <select
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            value={formData.profissional}
                            onChange={e => setFormData({ ...formData, profissional: e.target.value })}
                        >
                            <option value="">Selecione um barbeiro</option>
                            {isValidated && <option value="Pedro">Pedro</option>}
                            <option value="Thiago">Thiago</option>
                            <option value="Eduardo">Eduardo</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                                value={formData.data}
                                onChange={e => setFormData({ ...formData, data: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Hora</label>
                            <input
                                type="time"
                                required
                                className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                                value={formData.hora}
                                onChange={e => setFormData({ ...formData, hora: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Desconto</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2 text-gray-500">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    className="w-full bg-dark-900 border border-dark-700 rounded-md pl-8 pr-3 py-2 text-white focus:outline-none focus:border-primary"
                                    value={discount}
                                    onChange={e => setDiscount(Number(e.target.value))}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Total (R$)</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                readOnly
                                className="w-full bg-dark-800 border border-dark-700 rounded-md px-3 py-2 text-primary font-bold text-lg focus:outline-none cursor-not-allowed"
                                value={formData.valor}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-dark-900 font-bold py-3 rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 mt-4 text-lg"
                    >
                        {loading ? 'Salvando...' : 'Agendar'}
                    </button>
                </form>
            </div>

            {/* New Client Modal */}
            {showNewClientModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-white">Novo Cliente</h2>
                            <button
                                type="button"
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
                                type="button"
                                onClick={() => setShowNewClientModal(false)}
                                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
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
