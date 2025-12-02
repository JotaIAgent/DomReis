import { supabase } from './src/lib/supabase.js';
import { parseDateToLocal, isSameDay } from './src/utils/dateUtils.js';

async function debug() {
    console.log('Fetching appointments...');
    const { data, error } = await supabase.from('dados_agendamentos').select('Data, Hora, Cliente');
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} appointments.`);
    console.log('-------------------------------------------------------------------');
    console.log('| Cliente | Raw Data | Local Date | Is Today? |');
    console.log('-------------------------------------------------------------------');

    const today = new Date();
    // Mock today as Dec 2nd 2025 for testing if needed, or use real today
    // today.setFullYear(2025, 11, 2); 

    data.forEach(apt => {
        const date = parseDateToLocal(apt.Data);
        const dateStr = date ? date.toLocaleDateString('pt-BR') : 'NULL';
        const isToday = isSameDay(date, today) ? 'YES' : 'NO';

        console.log(`| ${apt.Cliente.padEnd(10).slice(0, 10)} | ${apt.Data.padEnd(25)} | ${dateStr.padEnd(10)} | ${isToday} |`);
    });
}

debug();
