const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTable() {
    console.log('Checking transacoes_financeiras table...');

    const { data, error } = await supabase
        .from('transacoes_financeiras')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        if (error.code === '42P01') {
            console.log('Table does not exist.');
        }
    } else {
        console.log('Table exists!');
    }
}

checkTable();
