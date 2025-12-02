const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVIPs() {
    console.log('Checking VIPs...');

    const { data, error } = await supabase
        .from('cliente_vips')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('VIPs Data:', JSON.stringify(data, null, 2));
        if (data.length > 0) {
            console.log('Sample Valor:', data[0].valor_mensalidade, 'Type:', typeof data[0].valor_mensalidade);
            console.log('Sample Data Exp:', data[0].data_expiração);
        }
    }
}

checkVIPs();
