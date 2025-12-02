import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X, DollarSign, Calendar, FileText, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'
import clsx from 'clsx'

export default function NewTransactionModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        tipo: 'expense', // 'pix_manual', 'expense', 'refund'
        valor: '',
        descricao: '',
        data: new Date().toISOString().split('T')[0]
    })
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Format value to currency string or number depending on backend expectation
            // Based on previous patterns, we save as text "R$ XX,XX" or similar, but let's try to be consistent.
            // The existing 'comprovantes_pix' uses text. 'dados_agendamentos' uses text.
            // Let's save as text to match the system's pattern, or maybe better, save as number if we can.
            // But to avoid breaking the pattern, I'll save as text "R$ XX,XX" for consistency with the read logic I just wrote.

            const formattedValue = `R$ ${parseFloat(formData.valor).toFixed(2).replace('.', ',')}`

            // We need a table for this. Let's assume 'transacoes_financeiras'
            const { error } = await supabase
                .from('transacoes_financeiras')
                .insert([{
                    tipo: formData.tipo,
                    valor: formattedValue,
                    descricao: formData.descricao,
                    data: formData.data.split('-').reverse().join('/'), // Save as DD/MM/YYYY
                    created_at: new Date().toISOString()
                }])

            if (error) throw error

            onSuccess()
            onClose()
            setFormData({
                tipo: 'expense',
                valor: '',
                descricao: '',
                data: new Date().toISOString().split('T')[0]
            })
        } catch (error) {
            console.error('Error creating transaction:', error)
            alert('Erro ao salvar transação. Verifique se a tabela "transacoes_financeiras" existe.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <h2 className="text-lg font-bold text-white flex items-center">
                        <DollarSign className="mr-2 text-primary" size={20} />
                        Nova Transação
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Transaction Type */}
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo: 'pix_manual' })}
                            className={clsx(
                                "p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors",
                                formData.tipo === 'pix_manual'
                                    ? "bg-green-500/20 border-green-500 text-green-500"
                                    : "bg-dark-900 border-dark-700 text-gray-400 hover:bg-dark-700"
                            )}
                        >
                            <ArrowUpCircle size={20} />
                            <span className="text-xs font-bold">Entrada</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo: 'expense' })}
                            className={clsx(
                                "p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors",
                                formData.tipo === 'expense'
                                    ? "bg-red-500/20 border-red-500 text-red-500"
                                    : "bg-dark-900 border-dark-700 text-gray-400 hover:bg-dark-700"
                            )}
                        >
                            <ArrowDownCircle size={20} />
                            <span className="text-xs font-bold">Gasto</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, tipo: 'refund' })}
                            className={clsx(
                                "p-2 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors",
                                formData.tipo === 'refund'
                                    ? "bg-orange-500/20 border-orange-500 text-orange-500"
                                    : "bg-dark-900 border-dark-700 text-gray-400 hover:bg-dark-700"
                            )}
                        >
                            <ArrowDownCircle size={20} />
                            <span className="text-xs font-bold">Devolução</span>
                        </button>
                    </div>

                    {/* Value */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            value={formData.valor}
                            onChange={e => setFormData({ ...formData, valor: e.target.value })}
                            placeholder="0,00"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FileText className="h-5 w-5 text-gray-500" />
                            </div>
                            <input
                                type="text"
                                required
                                className="w-full bg-dark-900 border border-dark-700 rounded-md pl-10 pr-3 py-2 text-white focus:outline-none focus:border-primary"
                                value={formData.descricao}
                                onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                                placeholder="Ex: Conta de Luz, Reembolso Cliente X..."
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Data</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Calendar className="h-5 w-5 text-gray-500" />
                            </div>
                            <input
                                type="date"
                                required
                                className="w-full bg-dark-900 border border-dark-700 rounded-md pl-10 pr-3 py-2 text-white focus:outline-none focus:border-primary"
                                value={formData.data}
                                onChange={e => setFormData({ ...formData, data: e.target.value })}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-dark-900 font-bold py-2 rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Salvando...' : 'Salvar Transação'}
                    </button>
                </form>
            </div>
        </div>
    )
}
