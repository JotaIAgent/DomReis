import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, DollarSign, Loader } from 'lucide-react'
import clsx from 'clsx'
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Reports() {
    const navigate = useNavigate()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [loading, setLoading] = useState(false)
    const [dailyTotals, setDailyTotals] = useState({})

    useEffect(() => {
        fetchMonthData()
    }, [currentDate])

    const fetchMonthData = async () => {
        setLoading(true)
        try {
            const start = startOfMonth(currentDate)
            const end = endOfMonth(currentDate)

            // Adjust to cover full days in local time
            start.setHours(0, 0, 0, 0)
            end.setHours(23, 59, 59, 999)

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

            // Process Data
            const totals = {}

            // Helper to parse values
            const parseValue = (val) => {
                if (typeof val === 'string') {
                    const cleanStr = val.replace(/[^\d,.-]/g, '').replace(',', '.')
                    return parseFloat(cleanStr) || 0
                }
                return Number(val) || 0
            }

            // Helper to parse date string to YYYY-MM-DD for key
            const getDateKey = (dateStr) => {
                if (!dateStr) return null

                // Handle ISO strings: Extract YYYY-MM-DD directly
                if (dateStr.includes('T')) {
                    return dateStr.split('T')[0]
                }

                // Handle YYYY-MM-DD without T
                if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    return dateStr
                }

                // Handle DD/MM/YYYY
                const matchFull = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
                if (matchFull) {
                    const [_, day, month, year] = matchFull
                    return `${year}-${month}-${day}`
                }

                // Handle DD/MM (assume current year)
                const matchShort = dateStr.match(/(\d{2})\/(\d{2})/)
                if (matchShort) {
                    const [_, day, month] = matchShort
                    const year = new Date().getFullYear()
                    return `${year}-${month}-${day}`
                }

                return null
            }

            // Aggregate Appointments
            appointments?.forEach(apt => {
                const key = getDateKey(apt.Data)
                if (key) {
                    totals[key] = (totals[key] || 0) + parseValue(apt['Valor serviços'])
                }
            })

            // Aggregate PIX
            pix?.forEach(p => {
                const key = getDateKey(p.data)
                if (key) {
                    totals[key] = (totals[key] || 0) + parseValue(p.valor)
                }
            })

            // Aggregate Manual Transactions
            manual?.forEach(t => {
                const key = getDateKey(t.data)
                if (key) {
                    const val = parseValue(t.valor)
                    const isIncome = t.tipo === 'pix_manual' || t.tipo === 'RECEITA PIX'
                    const isRefund = t.tipo === 'refund'

                    if (isIncome) {
                        totals[key] = (totals[key] || 0) + val
                    } else {
                        // Expense or Refund - subtract from total? 
                        // User asked for "quanto faturei" (revenue). 
                        // Usually revenue is income. Net profit is Income - Expense.
                        // Let's show Net Value for the day to be most useful, or just Revenue?
                        // "quanto eu faturei" usually means Gross Revenue. 
                        // But "controle sobre o mes" implies seeing the balance.
                        // Let's calculate Net Balance (Revenue - Expenses) for the cell display.
                        totals[key] = (totals[key] || 0) - val
                    }
                }
            })

            setDailyTotals(totals)

        } catch (error) {
            console.error('Error fetching report data:', error)
        } finally {
            setLoading(false)
        }
    }

    const nextMonth = () => setCurrentDate(addMonths(currentDate, 1))
    const prevMonth = () => setCurrentDate(subMonths(currentDate, 1))

    const days = eachDayOfInterval({
        start: startOfMonth(currentDate),
        end: endOfMonth(currentDate)
    })

    // Calculate empty days for start of month grid
    const startDay = getDay(startOfMonth(currentDate)) // 0 = Sunday
    const emptyDays = Array(startDay).fill(null)

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0)
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-primary flex items-center">
                    <CalendarIcon className="mr-3" />
                    Relatório Mensal
                </h1>

                <div className="flex items-center bg-dark-800 rounded-lg p-1 border border-dark-700">
                    <button onClick={prevMonth} className="p-2 hover:bg-dark-700 rounded-md text-gray-400 hover:text-white transition-colors">
                        <ChevronLeft size={20} />
                    </button>
                    <span className="px-4 font-bold text-white capitalize min-w-[140px] text-center">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button onClick={nextMonth} className="p-2 hover:bg-dark-700 rounded-md text-gray-400 hover:text-white transition-colors">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader className="animate-spin text-primary" size={40} />
                </div>
            ) : (
                <div className="bg-dark-800 rounded-xl border border-dark-700 shadow-lg p-6">
                    <div className="grid grid-cols-7 gap-4 mb-4">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                            <div key={day} className="text-center text-gray-400 font-medium text-sm uppercase">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-4">
                        {emptyDays.map((_, i) => (
                            <div key={`empty-${i}`} className="aspect-square bg-dark-900/30 rounded-lg border border-dark-700/30" />
                        ))}

                        {days.map(day => {
                            const dateKey = format(day, 'yyyy-MM-dd')
                            const total = dailyTotals[dateKey] || 0
                            const isToday = isSameDay(day, new Date())

                            return (
                                <button
                                    key={day.toString()}
                                    onClick={() => navigate(`/relatorios/${dateKey}`)}
                                    className={clsx(
                                        "aspect-square rounded-lg border p-2 flex flex-col justify-between transition-all hover:scale-105",
                                        isToday
                                            ? "bg-primary/10 border-primary"
                                            : "bg-dark-900 border-dark-700 hover:border-gray-500",
                                        total > 0 ? "hover:shadow-[0_0_15px_rgba(34,197,94,0.2)]" : "",
                                        total < 0 ? "hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]" : ""
                                    )}
                                >
                                    <span className={clsx(
                                        "text-sm font-bold",
                                        isToday ? "text-primary" : "text-gray-400"
                                    )}>
                                        {format(day, 'd')}
                                    </span>

                                    <div className="flex flex-col items-end">
                                        {total !== 0 && (
                                            <span className={clsx(
                                                "text-xs font-bold truncate w-full text-right",
                                                total > 0 ? "text-green-500" : "text-red-500"
                                            )}>
                                                {formatCurrency(total)}
                                            </span>
                                        )}
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
