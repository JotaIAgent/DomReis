import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar, Clock, User, Scissors, FileText } from 'lucide-react'
import clsx from 'clsx'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function DailyReport() {
    const { date } = useParams()
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState([])
    const [summary, setSummary] = useState({
        total: 0,
        income: 0,
        expense: 0
    })

    useEffect(() => {
        if (date) {
            fetchDayData()
        }
    }, [date])

    const fetchDayData = async () => {
        setLoading(true)
        try {
            // Parse date string (YYYY-MM-DD) to compare
            // We need to match DD/MM/YYYY or DD/MM formats in DB
            // Or ISO strings

            const targetDate = new Date(date + 'T00:00:00')

            // 1. Fetch Appointments
            const { data: appointments, error: aptError } = await supabase
                .from('dados_agendamentos')
                .select('*')

            if (aptError) throw aptError

            // 2. Fetch PIX
            const { data: pix, error: pixError } = await supabase
                .from('comprovantes_pix')
                .select('*')

            if (pixError && pixError.code !== '42P01') console.error('Error fetching PIX:', pixError)

            // 3. Fetch Manual Transactions
            const { data: manual, error: manualError } = await supabase
                .from('transacoes_financeiras')
                .select('*')

            if (manualError && manualError.code !== '42P01') console.error('Error fetching manual:', manualError)

            // Helper to parse values
            const parseValue = (val) => {
                if (typeof val === 'string') {
                    const cleanStr = val.replace(/[^\d,.-]/g, '').replace(',', '.')
                    return parseFloat(cleanStr) || 0
                }
                return Number(val) || 0
            }

            // Helper to check if item matches target date
            const isSameDate = (dateStr) => {
                if (!dateStr) return false

                // Handle DD/MM/YYYY
                const matchFull = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
                if (matchFull) {
                    const [_, day, month, year] = matchFull
                    return `${year}-${month}-${day}` === date
                }

                // Handle DD/MM (assume current year)
                const matchShort = dateStr.match(/(\d{2})\/(\d{2})/)
                if (matchShort) {
                    const [_, day, month] = matchShort
                    const year = new Date().getFullYear()
                    return `${year}-${month}-${day}` === date
                }

                // Handle ISO strings: Extract YYYY-MM-DD directly
                if (dateStr.includes('T')) {
                    const [datePart] = dateStr.split('T')
                    return datePart === date
                }

                // Handle YYYY-MM-DD without T
                if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    return dateStr === date
                }
            }

            const dayTransactions = []
            let income = 0
            let expense = 0

            // Process Appointments
            appointments?.forEach(apt => {
                if (isSameDate(apt.Data)) {
                    const val = parseValue(apt['Valor serviços'])
                    income += val
                    dayTransactions.push({
                        id: apt.id || Math.random(),
                        type: 'appointment',
                        time: apt.Hora,
                        description: `Agendamento - ${apt.Cliente}`,
                        details: apt.Serviços,
                        barber: apt.Profissional,
                        value: val,
                        isIncome: true
                    })
                }
            })

            // Process PIX
            pix?.forEach(p => {
                if (isSameDate(p.data)) {
                    const val = parseValue(p.valor)
                    income += val
                    dayTransactions.push({
                        id: p.id,
                        type: 'pix',
                        time: '-', // PIX usually doesn't have time in this table
                        description: `PIX - ${p.nome_pagador || 'Cliente'}`,
                        details: 'Comprovante PIX',
                        value: val,
                        isIncome: true
                    })
                }
            })

            // Process Manual
            manual?.forEach(t => {
                if (isSameDate(t.data)) {
                    const val = parseValue(t.valor)
                    const isInc = t.tipo === 'pix_manual' || t.tipo === 'RECEITA PIX'
                    const isRef = t.tipo === 'refund'

                    if (isInc) {
                        income += val
                    } else {
                        expense += val
                    }

                    dayTransactions.push({
                        id: t.id,
                        type: t.tipo,
                        time: '-',
                        description: t.descricao || (isInc ? 'Receita Manual' : (isRef ? 'Devolução' : 'Despesa')),
                        details: isInc ? 'Entrada Manual' : (isRef ? 'Reembolso' : 'Gasto'),
                        value: val,
                        isIncome: isInc,
                        isExpense: !isInc
                    })
                }
            })

            // Sort by time/type
            dayTransactions.sort((a, b) => {
                if (a.time !== '-' && b.time !== '-') return a.time.localeCompare(b.time)
                if (a.time !== '-') return -1
                if (b.time !== '-') return 1
                return 0
            })

            setTransactions(dayTransactions)
            setSummary({
                total: income - expense,
                income,
                expense
            })

        } catch (error) {
            console.error('Error fetching daily details:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
    }

    const formatDate = (dateStr) => {
        const [year, month, day] = dateStr.split('-')
        const dateObj = new Date(year, month - 1, day)
        return format(dateObj, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/relatorios')}
                    className="p-2 hover:bg-dark-800 rounded-full text-gray-400 hover:text-white transition-colors"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-primary capitalize">
                        {date ? formatDate(date) : 'Relatório Diário'}
                    </h1>
                    <p className="text-gray-400 text-sm">Detalhamento das movimentações do dia</p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingUp size={64} className="text-green-500" />
                    </div>
                    <p className="text-sm text-gray-400">Entradas</p>
                    <p className="text-2xl font-bold text-green-500 mt-1">
                        {formatCurrency(summary.income)}
                    </p>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-dark-700 shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <TrendingDown size={64} className="text-red-500" />
                    </div>
                    <p className="text-sm text-gray-400">Saídas</p>
                    <p className="text-2xl font-bold text-red-500 mt-1">
                        {formatCurrency(summary.expense)}
                    </p>
                </div>

                <div className="bg-dark-800 p-6 rounded-xl border border-primary shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <DollarSign size={64} className="text-primary" />
                    </div>
                    <p className="text-sm text-gray-400">Saldo do Dia</p>
                    <p className="text-3xl font-bold text-white mt-1">
                        {formatCurrency(summary.total)}
                    </p>
                </div>
            </div>

            {/* Transactions List */}
            <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg overflow-hidden">
                <div className="p-4 border-b border-dark-700">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                        <FileText className="mr-2 text-primary" size={20} />
                        Extrato de Movimentações
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-400">Carregando dados...</div>
                ) : (
                    <div className="divide-y divide-dark-700">
                        {transactions.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Nenhuma movimentação registrada neste dia.
                            </div>
                        ) : (
                            transactions.map((tx, idx) => (
                                <div key={tx.id || idx} className="p-4 hover:bg-dark-700/50 transition-colors flex items-center justify-between">
                                    <div className="flex items-start gap-4">
                                        <div className={clsx(
                                            "p-2 rounded-lg",
                                            tx.type === 'appointment' ? "bg-blue-500/10 text-blue-500" :
                                                tx.type === 'pix' ? "bg-green-500/10 text-green-500" :
                                                    tx.isExpense ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                                        )}>
                                            {tx.type === 'appointment' ? <Scissors size={20} /> :
                                                tx.type === 'pix' ? <DollarSign size={20} /> :
                                                    tx.isExpense ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                                        </div>

                                        <div>
                                            <h3 className="font-semibold text-white">{tx.description}</h3>
                                            <div className="flex items-center gap-3 text-sm text-gray-400 mt-1">
                                                {tx.time !== '-' && (
                                                    <span className="flex items-center">
                                                        <Clock size={12} className="mr-1" />
                                                        {tx.time}
                                                    </span>
                                                )}
                                                <span>{tx.details}</span>
                                                {tx.barber && (
                                                    <span className="flex items-center text-primary">
                                                        <User size={12} className="mr-1" />
                                                        {tx.barber}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={clsx(
                                        "font-bold text-lg",
                                        tx.isExpense ? "text-red-500" : "text-green-500"
                                    )}>
                                        {tx.isExpense ? '-' : '+'} {formatCurrency(tx.value)}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
