import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Search, ShoppingCart, Trash2, Plus, UserPlus, X } from 'lucide-react'

export default function Sales() {
    const [products, setProducts] = useState([])
    const [cart, setCart] = useState([])
    const [clients, setClients] = useState([])
    const [selectedClient, setSelectedClient] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [clientSearch, setClientSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [showNewClientModal, setShowNewClientModal] = useState(false)
    const [newClient, setNewClient] = useState({ nome: '', cpf: '', telefone: '' })

    useEffect(() => {
        fetchProducts()
        fetchClients()
    }, [])

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .eq('active', true)
            .gt('stock', 0)
            .order('name')
        setProducts(data || [])
    }

    const fetchClients = async () => {
        const { data } = await supabase
            .from('clientes')
            .select('*')
            .order('Nome')
        setClients(data || [])
    }

    const addToCart = (product) => {
        const existing = cart.find(item => item.id === product.id)
        if (existing) {
            if (existing.quantity >= product.stock) {
                alert('Estoque insuficiente')
                return
            }
            setCart(cart.map(item =>
                item.id === product.id
                    ? { ...item, quantity: item.quantity + 1 }
                    : item
            ))
        } else {
            setCart([...cart, { ...product, quantity: 1 }])
        }
    }

    const removeFromCart = (productId) => {
        setCart(cart.filter(item => item.id !== productId))
    }

    const updateQuantity = (productId, delta) => {
        setCart(cart.map(item => {
            if (item.id === productId) {
                const newQty = item.quantity + delta
                const product = products.find(p => p.id === productId)
                if (newQty > product.stock) return item
                return { ...item, quantity: Math.max(1, newQty) }
            }
            return item
        }))
    }

    const handleCreateClient = async (e) => {
        e.preventDefault()
        try {
            const { data, error } = await supabase
                .from('clientes')
                .insert([{
                    Nome: newClient.nome,
                    CPF: newClient.cpf,
                    Telefone: newClient.telefone
                }])
                .select()
                .single()

            if (error) throw error

            setClients([...clients, data])
            setSelectedClient(data)
            setShowNewClientModal(false)
            setNewClient({ nome: '', cpf: '', telefone: '' })
        } catch (error) {
            console.error('Error creating client:', error)
            alert('Erro ao cadastrar cliente')
        }
    }

    const handleCheckout = async () => {
        if (!selectedClient) {
            alert('Selecione um cliente')
            return
        }
        if (cart.length === 0) {
            alert('Carrinho vazio')
            return
        }

        setLoading(true)
        try {
            const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

            // Get Brazil timezone date
            const now = new Date()
            const brazilDate = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }).split('/').reverse().join('-')

            // 1. Create transaction record (using transacoes_financeiras or a new sales table)
            // Assuming transacoes_financeiras for now based on existing schema context
            const { error: txError } = await supabase
                .from('transacoes_financeiras')
                .insert([{
                    tipo: 'entrada',
                    valor: total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                    descricao: `Venda para ${selectedClient.Nome}: ${cart.map(i => `${i.quantity}x ${i.name}`).join(', ')}`,
                    data: brazilDate,
                    created_at: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                }])

            if (txError) throw txError

            // 2. Update stock
            for (const item of cart) {
                const { error: stockError } = await supabase
                    .from('products')
                    .update({ stock: products.find(p => p.id === item.id).stock - item.quantity })
                    .eq('id', item.id)

                if (stockError) throw stockError
            }

            alert('Venda realizada com sucesso!')
            setCart([])
            setSelectedClient(null)
            fetchProducts() // Refresh stock
        } catch (error) {
            console.error('Error processing sale:', error)
            alert(`Erro ao processar venda: ${error.message || error.details || 'Erro desconhecido'}`)
        } finally {
            setLoading(false)
        }
    }

    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredClients = clients.filter(c =>
        c.Nome?.toLowerCase().includes(clientSearch.toLowerCase()) ||
        c.CPF?.includes(clientSearch)
    )

    return (
        <div className="p-6 max-w-6xl mx-auto h-[calc(100vh-2rem)] flex gap-6">
            {/* Left: Product Selection */}
            <div className="flex-1 flex flex-col">
                <h1 className="text-3xl font-bold text-white mb-6">Nova Venda</h1>

                <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar produtos..."
                            className="w-full bg-dark-900 border border-dark-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-primary"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pr-2">
                    {filteredProducts.map(product => (
                        <div
                            key={product.id}
                            onClick={() => addToCart(product)}
                            className="bg-dark-800 p-4 rounded-xl border border-dark-700 hover:border-primary cursor-pointer transition-all group"
                        >
                            <h3 className="font-bold text-white group-hover:text-primary mb-1">{product.name}</h3>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-400">Estoque: {product.stock}</span>
                                <span className="font-bold text-green-400">R$ {product.price}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Cart & Checkout */}
            <div className="w-96 bg-dark-800 rounded-xl border border-dark-700 flex flex-col h-full">
                <div className="p-4 border-b border-dark-700">
                    <h2 className="text-xl font-bold text-white flex items-center">
                        <ShoppingCart className="mr-2" /> Carrinho
                    </h2>
                </div>

                {/* Client Selection */}
                <div className="p-4 border-b border-dark-700">
                    {selectedClient ? (
                        <div className="flex justify-between items-center bg-dark-900 p-3 rounded-lg border border-primary/30">
                            <div>
                                <p className="font-bold text-white">{selectedClient.Nome}</p>
                                <p className="text-xs text-gray-400">{selectedClient.CPF}</p>
                            </div>
                            <button onClick={() => setSelectedClient(null)} className="text-red-400 hover:text-red-300">
                                <X size={18} />
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar cliente (Nome ou CPF)..."
                                className="w-full bg-dark-900 border border-dark-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary text-sm"
                                value={clientSearch}
                                onChange={e => setClientSearch(e.target.value)}
                            />
                            {clientSearch && (
                                <div className="absolute top-full left-0 right-0 bg-dark-900 border border-dark-600 rounded-b-lg shadow-xl z-20 max-h-48 overflow-y-auto">
                                    {filteredClients.map(client => (
                                        <div
                                            key={client.id}
                                            onClick={() => {
                                                setSelectedClient(client)
                                                setClientSearch('')
                                            }}
                                            className="p-2 hover:bg-dark-800 cursor-pointer text-sm text-gray-300"
                                        >
                                            {client.Nome}
                                        </div>
                                    ))}
                                    <button
                                        onClick={() => setShowNewClientModal(true)}
                                        className="w-full p-2 text-left text-primary hover:bg-dark-800 text-sm font-bold border-t border-dark-700 flex items-center"
                                    >
                                        <UserPlus size={14} className="mr-2" />
                                        Cadastrar Novo Cliente
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {cart.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            Carrinho vazio
                        </div>
                    ) : (
                        cart.map(item => (
                            <div key={item.id} className="flex justify-between items-center bg-dark-900 p-3 rounded-lg">
                                <div>
                                    <p className="font-medium text-white text-sm">{item.name}</p>
                                    <p className="text-xs text-primary">R$ {item.price * item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => updateQuantity(item.id, -1)}
                                        className="w-6 h-6 rounded bg-dark-700 text-white flex items-center justify-center hover:bg-dark-600"
                                    >
                                        -
                                    </button>
                                    <span className="text-sm w-4 text-center text-white">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.id, 1)}
                                        className="w-6 h-6 rounded bg-dark-700 text-white flex items-center justify-center hover:bg-dark-600"
                                    >
                                        +
                                    </button>
                                    <button
                                        onClick={() => removeFromCart(item.id)}
                                        className="text-red-500 hover:text-red-400 ml-2"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Total & Checkout */}
                <div className="p-4 border-t border-dark-700 bg-dark-900/50">
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-gray-400">Total</span>
                        <span className="text-2xl font-bold text-primary">
                            R$ {cart.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2)}
                        </span>
                    </div>
                    <button
                        onClick={handleCheckout}
                        disabled={loading || cart.length === 0 || !selectedClient}
                        className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Processando...' : 'Finalizar Venda'}
                    </button>
                </div>
            </div>

            {/* New Client Modal */}
            {showNewClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                    <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md p-6">
                        <h2 className="text-xl font-bold text-white mb-4">Novo Cliente</h2>
                        <form onSubmit={handleCreateClient} className="space-y-4">
                            <input
                                type="text"
                                placeholder="Nome Completo"
                                required
                                className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                                value={newClient.nome}
                                onChange={e => setNewClient({ ...newClient, nome: e.target.value })}
                            />
                            <input
                                type="text"
                                placeholder="CPF"
                                className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                                value={newClient.cpf}
                                onChange={e => setNewClient({ ...newClient, cpf: e.target.value })}
                            />
                            <input
                                type="tel"
                                placeholder="Telefone"
                                required
                                className="w-full bg-dark-900 border border-dark-600 rounded p-2 text-white"
                                value={newClient.telefone}
                                onChange={e => setNewClient({ ...newClient, telefone: e.target.value })}
                            />
                            <div className="flex justify-end gap-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowNewClientModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-primary text-dark-900 rounded font-bold hover:bg-yellow-500"
                                >
                                    Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
