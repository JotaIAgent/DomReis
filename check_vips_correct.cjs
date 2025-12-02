const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVIPsCorrectTable() {
    console.log('Checking VIPs with table "clientes_vips"...');

    const { data, error } = await supabase
        .from('clientes_vips')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Success! Found', data.length, 'VIPs.');
        console.log('Data:', JSON.stringify(data, null, 2));
    }
}

checkVIPsCorrectTable();
