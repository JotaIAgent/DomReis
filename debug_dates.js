import { supabase } from './src/lib/supabase.js';

// Copied from Appointments.jsx
const parseDateAppt = (dateStr) => {
    if (!dateStr) return null
    if (dateStr.includes('T')) {
        const [datePart] = dateStr.split('T')
        const [year, month, day] = datePart.split('-')
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateStr.split('-')
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    const matchFull = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    if (matchFull) {
        const [_, day, month, year] = matchFull
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    }
    const matchShort = dateStr.match(/(\d{2})\/(\d{2})/)
    if (matchShort) {
        const [_, day, month] = matchShort
        const year = new Date().getFullYear()
        return new Date(year, parseInt(month) - 1, parseInt(day))
    }
    return null
}

// Copied from Dashboard.jsx (simplified to just date part logic)
const parseDateDash = (dateString) => {
    try {
        let year, month, day
        if (dateString && dateString.includes('T')) {
            const [datePart] = dateString.split('T')
            const [y, m, d] = datePart.split('-')
            year = parseInt(y); month = parseInt(m); day = parseInt(d)
        }
        else if (dateString && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [y, m, d] = dateString.split('-')
            year = parseInt(y); month = parseInt(m); day = parseInt(d)
        }
        else if (dateString) {
            const match = dateString.match(/(\d{2})\/(\d{2})/)
            if (match) {
                const [_, d, m] = match
                day = parseInt(d); month = parseInt(m); year = new Date().getFullYear()
            }
        }

        if (year && month && day) {
            return new Date(year, month - 1, day)
        }
        return null
    } catch {
        return null
    }
}

async function debug() {
    console.log('Fetching appointments...');
    const { data, error } = await supabase.from('dados_agendamentos').select('Data, Hora, Cliente');
    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${data.length} appointments.`);
    console.log('---------------------------------------------------');
    console.log('| Cliente | Raw Data | Appt Parse | Dash Parse | Match? |');
    console.log('---------------------------------------------------');

    data.forEach(apt => {
        const d1 = parseDateAppt(apt.Data);
        const d2 = parseDateDash(apt.Data);

        const s1 = d1 ? d1.toLocaleDateString('pt-BR') : 'NULL';
        const s2 = d2 ? d2.toLocaleDateString('pt-BR') : 'NULL';
        const match = s1 === s2 ? 'YES' : 'NO';

        console.log(`| ${apt.Cliente.padEnd(10).slice(0, 10)} | ${apt.Data.padEnd(15)} | ${s1.padEnd(10)} | ${s2.padEnd(10)} | ${match} |`);
    });
}

debug();
