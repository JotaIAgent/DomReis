import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2, Save, X } from 'lucide-react'

export default function Settings() {
    const [activeTab, setActiveTab] = useState('services')
    const [services, setServices] = useState([])
    const [products, setProducts] = useState([])
    const [loading, setLoading] = useState(true)
    const [editingId, setEditingId] = useState(null)
    const [editForm, setEditForm] = useState({})
    const [isAdding, setIsAdding] = useState(false)

    useEffect(() => {
        fetchData()
    }, [activeTab])

    const fetchData = async () => {
        setLoading(true)
        try {
            const table = activeTab === 'services' ? 'services' : 'products'
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq('active', true)
                .order('name')

            if (error) throw error

            if (activeTab === 'services') {
                setServices(data)
            } else {
                setProducts(data)
            }
        } catch (error) {
            console.error('Error fetching data:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleEdit = (item) => {
        setEditingId(item.id)
        setEditForm(item)
        setIsAdding(false)
    }

    const handleAdd = () => {
        setEditingId('new')
        setEditForm(activeTab === 'services' ? { name: '', price: '' } : { name: '', price: '', stock: '' })
        setIsAdding(true)
    }

    const handleCancel = () => {
        setEditingId(null)
        setEditForm({})
        setIsAdding(false)
    }

    const handleSave = async () => {
        try {
            const table = activeTab === 'services' ? 'services' : 'products'

            if (isAdding) {
                const { error } = await supabase
                    .from(table)
                    .insert([editForm])
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from(table)
                    .update(editForm)
                    .eq('id', editingId)
                if (error) throw error
            }

            fetchData()
            handleCancel()
        } catch (error) {
            console.error('Error saving:', error)
            alert('Erro ao salvar')
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Tem certeza que deseja excluir?')) return

        try {
            const table = activeTab === 'services' ? 'services' : 'products'
            const { error } = await supabase
                .from(table)
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchData()
        } catch (error) {
            console.error('Error deleting:', error)
            alert('Erro ao excluir')
        }
    }

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Valores e Estoque</h1>

            <div className="flex space-x-4 mb-6">
                <button
                    onClick={() => setActiveTab('services')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'services'
                        ? 'bg-primary text-dark-900'
                        : 'bg-dark-800 text-gray-400 hover:text-white'
                        }`}
                >
                    Serviços
                </button>
                <button
                    onClick={() => setActiveTab('products')}
                    className={`px-4 py-2 rounded-md font-medium transition-colors ${activeTab === 'products'
                        ? 'bg-primary text-dark-900'
                        : 'bg-dark-800 text-gray-400 hover:text-white'
                        }`}
                >
                    Produtos
                </button>
            </div>

            <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
                <div className="p-4 border-b border-dark-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">
                        {activeTab === 'services' ? 'Gerenciar Serviços' : 'Gerenciar Produtos'}
                    </h2>
                    <button
                        onClick={handleAdd}
                        disabled={editingId !== null}
                        className="flex items-center px-3 py-2 bg-primary text-dark-900 rounded-md font-bold hover:bg-yellow-500 transition-colors disabled:opacity-50"
                    >
                        <Plus size={18} className="mr-1" />
                        Adicionar
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-dark-900 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-3">Nome</th>
                                <th className="px-6 py-3">Preço (R$)</th>
                                {activeTab === 'products' && <th className="px-6 py-3">Estoque</th>}
                                <th className="px-6 py-3 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                            {/* Add Row */}
                            {isAdding && (
                                <tr className="bg-dark-700/50">
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            className="bg-dark-900 border border-dark-600 rounded px-2 py-1 text-white w-full"
                                            value={editForm.name}
                                            onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            placeholder="Nome"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="number"
                                            step="0.01"
                                            className="bg-dark-900 border border-dark-600 rounded px-2 py-1 text-white w-32"
                                            value={editForm.price}
                                            onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                            placeholder="0.00"
                                        />
                                    </td>
                                    {activeTab === 'products' && (
                                        <td className="px-6 py-4">
                                            <input
                                                type="number"
                                                className="bg-dark-900 border border-dark-600 rounded px-2 py-1 text-white w-24"
                                                value={editForm.stock}
                                                onChange={e => setEditForm({ ...editForm, stock: e.target.value })}
                                                placeholder="0"
                                            />
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={handleSave} className="text-green-500 hover:text-green-400">
                                            <Save size={18} />
                                        </button>
                                        <button onClick={handleCancel} className="text-red-500 hover:text-red-400">
                                            <X size={18} />
                                        </button>
                                    </td>
                                </tr>
                            )}

                            {/* Data Rows */}
                            {(activeTab === 'services' ? services : products).map((item) => (
                                <tr key={item.id} className="hover:bg-dark-700/30 transition-colors">
                                    <td className="px-6 py-4 text-white">
                                        {editingId === item.id ? (
                                            <input
                                                type="text"
                                                className="bg-dark-900 border border-dark-600 rounded px-2 py-1 text-white w-full"
                                                value={editForm.name}
                                                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                                            />
                                        ) : (
                                            item.name
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-300">
                                        {editingId === item.id ? (
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="bg-dark-900 border border-dark-600 rounded px-2 py-1 text-white w-32"
                                                value={editForm.price}
                                                onChange={e => setEditForm({ ...editForm, price: e.target.value })}
                                            />
                                        ) : (
                                            `R$ ${item.price}`
                                        )}
                                    </td>
                                    {activeTab === 'products' && (
                                        <td className="px-6 py-4 text-gray-300">
                                            {editingId === item.id ? (
                                                <input
                                                    type="number"
                                                    className="bg-dark-900 border border-dark-600 rounded px-2 py-1 text-white w-24"
                                                    value={editForm.stock}
                                                    onChange={e => setEditForm({ ...editForm, stock: e.target.value })}
                                                />
                                            ) : (
                                                item.stock
                                            )}
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right space-x-2">
                                        {editingId === item.id ? (
                                            <>
                                                <button onClick={handleSave} className="text-green-500 hover:text-green-400">
                                                    <Save size={18} />
                                                </button>
                                                <button onClick={handleCancel} className="text-red-500 hover:text-red-400">
                                                    <X size={18} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-300">
                                                    <Edit2 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-400">
                                                    <Trash2 size={18} />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
