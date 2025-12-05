import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co'
const supabaseAnonKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod'

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function debug() {
    console.log('--- Debugging Client Issues ---')

    // 1. Check 'clientes' table structure (by fetching one row)
    console.log('\n1. Checking "clientes" table structure...')
    const { data: sampleClient, error: sampleError } = await supabase
        .from('clientes')
        .select('*')
        .limit(1)

    if (sampleError) {
        console.error('Error fetching sample client:', sampleError)
    } else if (sampleClient && sampleClient.length > 0) {
        console.log('Available columns in "clientes":', Object.keys(sampleClient[0]))
        console.log('Sample client data:', sampleClient[0])
    } else {
        console.log('No clients found in table.')
    }

    // 2. Fetch specific client
    const targetName = 'João Pedro Faggionato Lima dos Santos'
    console.log(`\n2. Fetching client: "${targetName}"...`)
    const { data: targetClient, error: targetError } = await supabase
        .from('clientes')
        .select('*')
        .eq('Nome', targetName)
        .single()

    if (targetError) {
        console.error('Error fetching target client:', targetError)
    } else {
        console.log('Target Client Data:', targetClient)

        if (targetClient) {
            // 3. Check VIP status for this client
            console.log(`\n3. Checking VIP status for phone: "${targetClient.Telefone}"...`)
            const { data: vipRecord, error: vipError } = await supabase
                .from('clientes_vips')
                .select('*')
                .eq('telefone_cliente', targetClient.Telefone)

            if (vipError) {
                console.error('Error fetching VIP record:', vipError)
            } else {
                console.log('VIP Record(s) found:', vipRecord)
            }

            // 4. Try to update 'validado' to see specific error
            console.log('\n4. Attempting to update "validado" column...')
            const { error: updateError } = await supabase
                .from('clientes')
                .update({ validado: true })
                .eq('id', targetClient.id)

            if (updateError) {
                console.error('Update failed with error:', updateError)
            } else {
                console.log('Update successful.')
            }
        }
    }
}

debug()
