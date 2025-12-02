const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFinancials() {
    console.log('--- Debugging Financial Data ---');

    // 1. Check transacoes_financeiras
    console.log('\n1. Checking transacoes_financeiras:');
    const { data: manual, error: manualError } = await supabase
        .from('transacoes_financeiras')
        .select('*');

    if (manualError) {
        console.error('Error fetching manual transactions:', manualError);
    } else {
        console.log(`Found ${manual.length} records.`);
        if (manual.length > 0) {
            console.log('Sample:', JSON.stringify(manual[0], null, 2));
        }
    }

    // 2. Check comprovantes_pix
    console.log('\n2. Checking comprovantes_pix:');
    const { data: pix, error: pixError } = await supabase
        .from('comprovantes_pix')
        .select('*');

    if (pixError) {
        console.error('Error fetching PIX:', pixError);
    } else {
        console.log(`Found ${pix.length} records.`);
        if (pix.length > 0) {
            console.log('Sample:', JSON.stringify(pix[0], null, 2));
            console.log('Valor type:', typeof pix[0].valor);
        }
    }
}

debugFinancials();
