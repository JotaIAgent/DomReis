import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { X } from 'lucide-react'
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

    if (!isOpen) return null

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Combine date and time
            // const dateTime = new Date(`${formData.data}T${formData.hora}:00`)

            const { error } = await supabase
                .from('dados_agendamentos')
                .insert([{
                    Profissional: formData.profissional,
                    Serviços: formData.servicos,
                    Data: formData.data, // Save as YYYY-MM-DD string to avoid timezone shifts
                    Hora: formData.hora,
                    Cliente: formData.cliente,
                    Telefone: formData.telefone,
                    'Valor serviços': parseFloat(formData.valor)
                }])

            if (error) throw error

            onSuccess()
            onClose()
            setFormData({
                cliente: '',
                telefone: '',
                servicos: '',
                profissional: '',
                data: '',
                hora: '',
                valor: ''
            })
        } catch (error) {
            console.error('Error creating appointment:', error)
            alert('Erro ao criar agendamento')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-dark-700">
                    <h2 className="text-lg font-bold text-white">Novo Agendamento</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Cliente</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            value={formData.cliente}
                            onChange={e => setFormData({ ...formData, cliente: e.target.value })}
                        />
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

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Serviços</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            placeholder="Ex: Corte, Barba"
                            value={formData.servicos}
                            onChange={e => setFormData({ ...formData, servicos: e.target.value })}
                        />
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
                            <option value="Pedro">Pedro</option>
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

                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            step="0.01"
                            required
                            className="w-full bg-dark-900 border border-dark-700 rounded-md px-3 py-2 text-white focus:outline-none focus:border-primary"
                            value={formData.valor}
                            onChange={e => setFormData({ ...formData, valor: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-dark-900 font-bold py-2 rounded-md hover:bg-yellow-500 transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? 'Salvando...' : 'Agendar'}
                    </button>
                </form>
            </div>
        </div>
    )
}
