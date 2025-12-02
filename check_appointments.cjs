const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAppointments() {
    console.log('Fetching appointments...');

    const { data, error } = await supabase
        .from('dados_agendamentos')
        .select('*')
        .order('id', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error:', error);
        return;
    }

    const today = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
    console.log('Today (DD/MM):', today);

    console.log('\nLast 20 Appointments:');
    data.forEach(apt => {
        let aptDate = apt.Data;
        let parsedDate = aptDate;

        // Simulate the frontend logic
        if (apt.Data && (apt.Data.includes('T') || apt.Data.includes('-'))) {
            const dateObj = new Date(apt.Data);
            if (!isNaN(dateObj.getTime())) {
                parsedDate = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
            }
        }

        const match = parsedDate ? parsedDate.match(/(\d{2})\/(\d{2})/) : null;
        let finalDate = match ? `${match[1]}/${match[2]}` : parsedDate;

        const isMatch = finalDate === today;

        console.log(`ID: ${apt.id} | Data Raw: "${apt.Data}" | Parsed: "${finalDate}" | Match Today? ${isMatch ? 'YES' : 'NO'} | Client: ${apt.Cliente}`);
    });
}

checkAppointments();
