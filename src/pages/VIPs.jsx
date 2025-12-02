import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Crown, UserMinus, Calendar } from 'lucide-react'

export default function VIPs() {
    const [vips, setVips] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchVIPs()
    }, [])

    const fetchVIPs = async () => {
        try {
            const { data, error } = await supabase
                .from('clientes_vips')
                .select('*')
                .eq('status_assinatura', 'ATIVO')
                .order('nome_cliente', { ascending: true })

            if (error) throw error
            setVips(data)
        } catch (error) {
            console.error('Error fetching VIPs:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleInactivate = async (id) => {
        if (!window.confirm('Tem certeza que deseja inativar este VIP?')) return

        try {
            const { error } = await supabase
                .from('clientes_vips')
                .update({ status_assinatura: 'Inativo' })
                .eq('id', id) // Assuming 'id' is the PK as per prompt "id UUID (PK)" in user_roles/profile but prompt for cliente_vips didn't specify PK explicitly other than cpf/telefone. 
                // Wait, prompt for cliente_vips says:
                // cpf_cliente text
                // telefone_cliente text (Único)
                // It doesn't explicitly list an 'id' column. It lists 'cpf_cliente' and 'telefone_cliente'.
                // However, Supabase usually adds an 'id' column.
                // If not, I should use 'telefone_cliente' as key since it's unique.
                // Let's check the prompt again.
                // "cliente_vips ... telefone_cliente text (Único)"
                // I'll use telefone_cliente for the update condition to be safe.
                .eq('telefone_cliente', id) // passing phone as id for this function

            if (error) throw error

            fetchVIPs()
        } catch (error) {
            console.error('Error inactivating VIP:', error)
            alert('Erro ao inativar VIP')
        }
    }

    if (loading) {
        return <div className="text-center p-8 text-gray-400">Carregando VIPs...</div>
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-primary flex items-center">
                <Crown className="mr-3" />
                Clientes VIP
            </h1>

            <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-dark-700">
                        <thead className="bg-dark-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Cliente</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contato</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Assinatura</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Validade</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-dark-700">
                            {vips.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                                        Nenhum cliente VIP ativo.
                                    </td>
                                </tr>
                            ) : (
                                vips.map((vip) => (
                                    <tr key={vip.telefone_cliente} className="hover:bg-dark-700 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary mr-3">
                                                    <Crown size={16} />
                                                </div>
                                                <span className="text-sm font-medium text-white">{vip.nome_cliente}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {vip.telefone_cliente}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-primary font-medium">
                                            {(() => {
                                                const val = vip.valor_mensalidade
                                                const num = typeof val === 'string'
                                                    ? parseFloat(val.replace('R$', '').replace(',', '.').trim())
                                                    : Number(val)
                                                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num || 0)
                                            })()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            <div className="flex items-center">
                                                <Calendar size={14} className="mr-2 text-gray-500" />
                                                {vip.data_expiracao || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleInactivate(vip.telefone_cliente)}
                                                className="text-red-400 hover:text-red-300 transition-colors flex items-center justify-end w-full"
                                                title="Inativar VIP"
                                            >
                                                <UserMinus size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
