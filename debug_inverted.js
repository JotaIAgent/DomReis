import { supabase } from './src/lib/supabase.js';
import { parseDateToLocal, isSameDay } from './src/utils/dateUtils.js';

async function debug() {
    console.log('Fetching all appointments...');
    const { data, error } = await supabase
        .from('dados_agendamentos')
        .select('*')
        .order('Hora', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    const today = new Date();
    console.log(`Today is: ${today.toLocaleDateString('pt-BR')}`);
    console.log(`\nTotal appointments: ${data.length}`);

    // Filter for Appointments page (today only)
    const appointmentsPageData = data.filter(apt => {
        const aptDate = parseDateToLocal(apt.Data);
        return isSameDay(aptDate, today);
    });

    // Filter for Dashboard (today's metrics)
    const dashboardTodayData = data.filter(apt => {
        const date = parseDateToLocal(apt.Data);
        return isSameDay(date, today);
    });

    // Filter for Dashboard upcoming list (today and future)
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const dashboardUpcomingData = data
        .map(apt => {
            const date = parseDateToLocal(apt.Data);
            if (date && apt.Hora) {
                const [hours, minutes] = apt.Hora.split(':').map(Number);
                date.setHours(hours, minutes);
            }
            return { ...apt, parsedDate: date };
        })
        .filter(apt => apt.parsedDate && apt.parsedDate >= now)
        .sort((a, b) => a.parsedDate - b.parsedDate)
        .slice(0, 5);

    console.log('\n=== APPOINTMENTS PAGE (Today Only) ===');
    console.log(`Count: ${appointmentsPageData.length}`);
    appointmentsPageData.forEach(apt => {
        console.log(`  ${apt.Hora} - ${apt.Cliente} (${apt.Data})`);
    });

    console.log('\n=== DASHBOARD METRICS (Today Only) ===');
    console.log(`Count: ${dashboardTodayData.length}`);
    dashboardTodayData.forEach(apt => {
        console.log(`  ${apt.Hora} - ${apt.Cliente} (${apt.Data})`);
    });

    console.log('\n=== DASHBOARD UPCOMING LIST (Today + Future, Top 5) ===');
    console.log(`Count: ${dashboardUpcomingData.length}`);
    dashboardUpcomingData.forEach(apt => {
        console.log(`  ${apt.Hora} - ${apt.Cliente} (${apt.Data})`);
    });
}

debug();
