const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppointments() {
    console.log('Checking appointments...');

    const { data, error } = await supabase
        .from('dados_agendamentos')
        .select('*')
        .limit(5);

    console.log('Data:', JSON.stringify(data, null, 2));
    console.log('Error:', error);

    if (data && data.length > 0) {
        console.log('\nFirst appointment Data field:', data[0].Data);
        console.log('Type:', typeof data[0].Data);
    }
}

checkAppointments();
