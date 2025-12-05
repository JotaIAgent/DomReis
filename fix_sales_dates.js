import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co'
const supabaseAnonKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fixSalesDates() {
    console.log('--- Fixing Sales Dates to Brazil Timezone ---')

    // Fetch all sales transactions (tipo = 'entrada')
    const { data: sales, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .eq('tipo', 'entrada')

    if (error) {
        console.error('Error fetching sales:', error)
        return
    }

    console.log(`Found ${sales.length} sales transactions`)

    for (const sale of sales) {
        // Check if date looks like it needs fixing (ISO format with time component that might be off)
        // Current dates are in format YYYY-MM-DD from toISOString().split('T')[0]
        // We need to check if the date might have been shifted due to UTC

        const originalDate = sale.data
        console.log(`Sale ID ${sale.id}: current date = ${originalDate}, description = ${sale.descricao}`)

        // If created_at exists and is ISO, we can derive the correct Brazil date from it
        if (sale.created_at) {
            // Try to parse created_at - it could be ISO or locale string
            let createdDate
            if (sale.created_at.includes('T')) {
                // ISO format
                createdDate = new Date(sale.created_at)
            } else if (sale.created_at.includes('/')) {
                // Already in pt-BR locale format (DD/MM/YYYY HH:mm:ss)
                const [datePart] = sale.created_at.split(' ')
                const [day, month, year] = datePart.split('/')
                createdDate = new Date(year, month - 1, day)
            }

            if (createdDate && !isNaN(createdDate.getTime())) {
                // Get correct Brazil date
                const brazilDate = createdDate.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
                    .split('/').reverse().join('-')

                if (brazilDate !== originalDate) {
                    console.log(`  -> Fixing to: ${brazilDate}`)

                    const { error: updateError } = await supabase
                        .from('transacoes_financeiras')
                        .update({ data: brazilDate })
                        .eq('id', sale.id)

                    if (updateError) {
                        console.error(`  -> Error updating: ${updateError.message}`)
                    } else {
                        console.log(`  -> Updated successfully`)
                    }
                } else {
                    console.log(`  -> Date already correct`)
                }
            }
        }
    }

    console.log('\nDone!')
}

fixSalesDates()
