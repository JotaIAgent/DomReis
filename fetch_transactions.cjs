const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co'
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod'
const supabase = createClient(supabaseUrl, supabaseKey)

async function fetchTransactions() {
    const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .order('id', { ascending: false })
        .limit(5)

    if (error) {
        console.error('Error:', error)
    } else {
        console.log(JSON.stringify(data, null, 2))
    }
}

fetchTransactions()
