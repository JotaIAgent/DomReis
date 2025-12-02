import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'

export default function MakeVIPModal({ isOpen, onClose, clientData, onSuccess }) {
    const [formData, setFormData] = useState({
        valor_mensalidade: '',
        data_expiracao: ''
    })
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            const { error } = await supabase
                .from('clientes_vips')
                .upsert([{
                    cpf_cliente: 'N/A',
                    telefone_cliente: clientData.phone,
                    nome_cliente: clientData.name,
                    status_assinatura: 'ATIVO',
                    data_ativacao: new Date().toLocaleDateString('pt-BR'),
                    data_expiracao: new Date(formData.data_expiracao).toLocaleDateString('pt-BR'),
                    valor_mensalidade: `R$ ${parseFloat(formData.valor_mensalidade).toFixed(2).replace('.', ',')}`
                }], { onConflict: 'telefone_cliente' })

            if (error) throw error

            onSuccess()
            onClose()
        } catch (error) {
            console.error('Error making VIP:', error)
            alert('Erro ao tornar VIP')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <h2 className="text-lg font-bold text-white">Tornar VIP: {clientData.name}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Valor Mensalidade (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            value={formData.valor_mensalidade}
                            onChange={e => setFormData({ ...formData, valor_mensalidade: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Data de Expiração</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            value={formData.data_expiracao}
                            onChange={e => setFormData({ ...formData, data_expiracao: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-dark-900 font-bold py-2 rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Salvando...' : 'Confirmar VIP'}
                    </button>
                </form>
            </div>
        </div>
    )
}
