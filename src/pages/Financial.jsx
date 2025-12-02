import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { DollarSign, Calendar, Filter, TrendingUp, Scissors, CreditCard, Plus, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import clsx from 'clsx'
import NewTransactionModal from '../components/NewTransactionModal'

export default function Financial() {
    const [filterType, setFilterType] = useState('month') // 'month', '30days', 'custom'
    const [customRange, setCustomRange] = useState({ start: '', end: '' })
    const [appointmentsData, setAppointmentsData] = useState([])
    const [pixData, setPixData] = useState([])
    const [manualTransactions, setManualTransactions] = useState([])
    const [summary, setSummary] = useState({
        appointmentsTotal: 0,
        pixTotal: 0,
        expensesTotal: 0,
        total: 0
    })
    const [loading, setLoading] = useState(false)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        fetchFinancialData()
    }, [filterType, customRange])

    const parseDate = (dateStr) => {
        if (!dateStr) return null

        // Try to find DD/MM/YYYY pattern (works for "01/12/2025" and "Segunda, 01/12/2025")
        const matchFull = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
        if (matchFull) {
            const [_, day, month, year] = matchFull
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
        }

        // Try to find DD/MM pattern (works for "01/12", "Terç02/12") - Assume current year
        const matchShort = dateStr.match(/(\d{2})\/(\d{2})/)
        if (matchShort) {
            const [_, day, month] = matchShort
            const year = new Date().getFullYear()
            return new Date(year, parseInt(month) - 1, parseInt(day))
        }

        // Fallback to standard Date parse (ISO)
        const date = new Date(dateStr)
        return isNaN(date.getTime()) ? null : date
    }

    const filterByDateRange = (items, dateField, startDate, endDate) => {
        return items.filter(item => {
            const dateStr = item[dateField]
            const itemDate = parseDate(dateStr)
            if (!itemDate) return false

            // Normalize times to compare dates only
            const d = new Date(itemDate)
            d.setHours(0, 0, 0, 0)
            const start = new Date(startDate)
            start.setHours(0, 0, 0, 0)
            const end = new Date(endDate)
            end.setHours(23, 59, 59, 999)

            return d >= start && d <= end
        })
    }

    const fetchFinancialData = async () => {
        if (filterType === 'custom' && (!customRange.start || !customRange.end)) return

        setLoading(true)
        try {
            // Get date range based on filter type
            const { startDate, endDate } = getDateRange()

            // 1. Fetch appointments data
            const { data: appointments, error: aptError } = await supabase
                .from('dados_agendamentos')
                .select('*')
                .order('Data', { ascending: false })

            if (aptError) throw aptError

            // Filter appointments by date range (DD/MM format)
            const filteredAppointments = filterByDateRange(appointments || [], 'Data', startDate, endDate)
            setAppointmentsData(filteredAppointments)

            // 2. Fetch PIX data
            const { data: pix, error: pixError } = await supabase
                .from('comprovantes_pix')
                .select('*')
                .order('data', { ascending: false })

            if (pixError && pixError.code !== '42P01') console.error('Error fetching PIX:', pixError)

            const filteredPix = filterByDateRange(pix || [], 'data', startDate, endDate)
            setPixData(filteredPix)

            // 3. Fetch Manual Transactions
            const { data: manual, error: manualError } = await supabase
                .from('transacoes_financeiras')
                .select('*')
                .order('data', { ascending: false })

            if (manualError && manualError.code !== '42P01') console.error('Error fetching manual transactions:', manualError)

            const filteredManual = filterByDateRange(manual || [], 'data', startDate, endDate)

            // Merge PIX and Manual for the list display
            const pixAsTransactions = filteredPix.map(p => ({
                id: p.id,
                data: p.data,
                tipo: 'RECEITA PIX', // Label requested by user
                valor: p.valor,
                descricao: `PIX - ${p.nome_pagador || 'Cliente'}`
            }))

            const combinedTransactions = [...filteredManual, ...pixAsTransactions].sort((a, b) => {
                const dateA = parseDate(a.data)
                const dateB = parseDate(b.data)
                return dateB - dateA
            })

            setManualTransactions(combinedTransactions)

            // Calculate totals
            const parseValue = (val) => {
                if (typeof val === 'string') {
                    // Remove everything that is not a digit, comma, dot or minus sign
                    // Handle "R$:", "R$", etc by stripping non-numeric chars
                    // Keep dots for decimal values like "20.5"
                    const cleanStr = val.replace(/[^\d,.-]/g, '').replace(',', '.')
                    return parseFloat(cleanStr) || 0
                }
                return Number(val) || 0
            }

            const appointmentsTotal = filteredAppointments.reduce((acc, curr) => {
                return acc + parseValue(curr['Valor serviços'])
            }, 0)

            const pixTotal = filteredPix.reduce((acc, curr) => {
                return acc + parseValue(curr.valor)
            }, 0)

            // Manual totals
            let manualPixTotal = 0
            let expensesTotal = 0

            filteredManual.forEach(t => {
                const val = parseValue(t.valor)
                // Categorize based on type
                if (t.tipo === 'pix_manual' || t.tipo === 'RECEITA PIX') {
                    manualPixTotal += val
                } else if (t.tipo === 'refund') {
                    expensesTotal += val
                } else {
                    // Assume everything else (expense, Lazer, etc) is an expense
                    expensesTotal += val
                }
            })

            setSummary({
                appointmentsTotal,
                pixTotal: pixTotal + manualPixTotal,
                expensesTotal,
                total: (appointmentsTotal + pixTotal + manualPixTotal) - expensesTotal
            })

        } catch (error) {
            console.error('Error fetching financial data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getDateRange = () => {
        const today = new Date()
        let startDate, endDate

        if (filterType === 'month') {
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
            const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
            startDate = firstDay
            endDate = lastDay
        } else if (filterType === '30days') {
            startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
            endDate = today
        } else {
            startDate = new Date(customRange.start)
            endDate = new Date(customRange.end)
        }

        // Adjust time to start/end of day
        startDate.setHours(0, 0, 0, 0)
        endDate.setHours(23, 59, 59, 999)

        return { startDate, endDate }
    }

    const formatDisplayDate = (dateStr, timeStr) => {
        if (!dateStr || dateStr === 'Invalid Date') return '-'

        // If ISO (contains T)
        if (dateStr.includes('T')) {
            const date = new Date(dateStr)
            if (isNaN(date.getTime())) return '-'
            return `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })} ${timeStr || date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}`
        }

        // Try to extract DD/MM or DD/MM/YYYY from string to clean it up (e.g. remove "Terç" from "Terç02/12")
        const match = dateStr.match(/(\d{2})\/(\d{2})(?:\/(\d{4}))?/)
        if (match) {
            const [_, day, month, year] = match
            const currentYear = new Date().getFullYear()
            const finalYear = year || currentYear
            return `${day}/${month}/${finalYear} ${timeStr || ''}`.trim()
        }

        // Fallback
        return `${dateStr} ${timeStr || ''}`.trim()
    }

    const formatCurrency = (value) => {
        if (!value) return 'R$ 0,00'
        let num = 0
        if (typeof value === 'string') {
            const cleanStr = value.replace(/[^\d,.-]/g, '').replace(',', '.')
            num = parseFloat(cleanStr)
        } else {
            num = Number(value)
        }
        if (isNaN(num)) return 'R$ 0,00'
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary flex items-center">
                    <DollarSign className="mr-3" />
                    Controle Financeiro
                </h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-4 py-2 bg-primary text-dark-900 rounded-md font-bold hover:bg-yellow-500 transition-colors"
                >
                    <Plus size={20} className="mr-2" />
                    Nova Transação
                </button>
            </div>

            {/* Filters */}
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 shadow-lg flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2">
                    <Filter size={20} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-300">Filtrar por:</span>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterType('month')}
                        className={clsx(
                            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                            filterType === 'month' ? "bg-primary text-dark-900" : "bg-dark-700 text-gray-300 hover:bg-dark-600"
                        )}
                    >
                        Mês Atual
                    </button>
                    <button
                        onClick={() => setFilterType('30days')}
                        className={clsx(
                            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                            filterType === '30days' ? "bg-primary text-dark-900" : "bg-dark-700 text-gray-300 hover:bg-dark-600"
                        )}
                    >
                        Últimos 30 dias
                    </button>
                    <button
                        onClick={() => setFilterType('custom')}
                        className={clsx(
                            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
                            filterType === 'custom' ? "bg-primary text-dark-900" : "bg-dark-700 text-gray-300 hover:bg-dark-600"
                        )}
                    >
                        Customizado
                    </button>
                </div>

                {filterType === 'custom' && (
                    <div className="flex gap-2 items-center">
                        <input
                            type="date"
                            value={customRange.start}
                            onChange={(e) => setCustomRange(prev => ({ ...prev, start: e.target.value }))}
                            className="bg-dark-700 border border-dark-600 text-white rounded-md px-3 py-2 text-sm"
                        />
                        <span className="text-gray-400">-</span>
                        <input
                            type="date"
                            value={customRange.end}
                            onChange={(e) => setCustomRange(prev => ({ ...prev, end: e.target.value }))}
                            className="bg-dark-700 border border-dark-600 text-white rounded-md px-3 py-2 text-sm"
                        />
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Scissors size={64} className="text-primary" />
                    </div>
                    <p className="text-sm text-gray-400">Agendamentos</p>
                    <p className="text-2xl font-bold text-primary mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.appointmentsTotal)}
                    </p>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <CreditCard size={64} className="text-green-500" />
                    </div>
                    <p className="text-sm text-gray-400">Receita PIX</p>
                    <p className="text-2xl font-bold text-green-500 mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.pixTotal)}
                    </p>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <ArrowDownCircle size={64} className="text-red-500" />
                    </div>
                    <p className="text-sm text-gray-400">Gastos / Devoluções</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.expensesTotal)}
                    </p>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-primary shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp size={64} className="text-primary" />
                    </div>
                    <p className="text-sm text-gray-400">Saldo Total</p>
                    <p className="text-3xl font-bold text-white mt-1">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(summary.total)}
                    </p>
                </div>
            </div>

            {/* Reports Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Appointments Report */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                        <div className="flex items-center">
                            <Scissors size={20} className="text-primary mr-2" />
                            <h2 className="text-lg font-semibold text-white">Agendamentos</h2>
                        </div>
                        <span className="text-sm text-gray-400">{appointmentsData.length} itens</span>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                        <table className="w-full">
                            <thead className="bg-dark-900 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {appointmentsData.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-4 text-center text-gray-500 text-sm">
                                            Nenhum agendamento no período.
                                        </td>
                                    </tr>
                                ) : (
                                    appointmentsData.map((apt, idx) => (
                                        <tr key={apt.id || idx} className="hover:bg-dark-700 transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                                {formatDisplayDate(apt.Data, apt.Hora)}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                                                {apt.Cliente}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-primary text-right font-medium">
                                                {formatCurrency(apt['Valor serviços'])}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Other Transactions Report */}
                <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
                    <div className="p-4 border-b border-dark-700 flex items-center justify-between">
                        <div className="flex items-center">
                            <DollarSign size={20} className="text-white mr-2" />
                            <h2 className="text-lg font-semibold text-white">Outras Transações</h2>
                        </div>
                        <span className="text-sm text-gray-400">{manualTransactions.length} itens</span>
                    </div>
                    <div className="overflow-x-auto max-h-80">
                        <table className="w-full">
                            <thead className="bg-dark-900 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Tipo/Desc</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase">Valor</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-700">
                                {manualTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan="3" className="px-4 py-4 text-center text-gray-500 text-sm">
                                            Nenhuma transação manual no período.
                                        </td>
                                    </tr>
                                ) : (
                                    manualTransactions.map((tx, idx) => {
                                        const isIncome = tx.tipo === 'pix_manual' || tx.tipo === 'RECEITA PIX'
                                        const isRefund = tx.tipo === 'refund'
                                        // If not income and not refund, assume expense (including 'Lazer')
                                        const isExpense = !isIncome && !isRefund

                                        return (
                                            <tr key={tx.id || idx} className="hover:bg-dark-700 transition-colors">
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-300">
                                                    {formatDisplayDate(tx.data)}
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap text-sm text-white">
                                                    <div className="flex flex-col">
                                                        <span className={clsx(
                                                            "text-xs font-bold uppercase",
                                                            isIncome && "text-green-500",
                                                            isExpense && "text-red-500",
                                                            isRefund && "text-orange-500"
                                                        )}>
                                                            {isIncome ? 'Entrada' : isRefund ? 'Devolução' : (tx.tipo === 'expense' ? 'Gasto' : tx.tipo)}
                                                        </span>
                                                        <span className="text-xs text-gray-400">{tx.descricao}</span>
                                                    </div>
                                                </td>
                                                <td className={clsx(
                                                    "px-4 py-3 whitespace-nowrap text-sm text-right font-medium",
                                                    isIncome ? "text-green-500" : "text-red-500"
                                                )}>
                                                    {isIncome ? '+' : '-'} {formatCurrency(tx.valor)}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <NewTransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchFinancialData}
            />
        </div>
    )
}
