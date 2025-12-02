const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log('Testing insert...');

    const testData = {
        Profissional: 'Teste',
        Serviços: 'Corte',
        Data: new Date().toISOString(), // Data e hora atual
        Hora: '09:00',
        Cliente: 'João',
        Telefone: '11999999999',
        'Valor serviços': 50.00
    };

    console.log('Inserting:', testData);

    const { data, error } = await supabase
        .from('dados_agendamentos')
        .insert([testData])
        .select();

    console.log('Result:', data);
    console.log('Error:', error);
}

testInsert();
