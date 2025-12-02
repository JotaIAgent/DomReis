const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_secret_IWIfSTn2qxPr4I0XyTbUEQ_l9GIzVaM';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    console.log('Testing Supabase connection...');
    try {
        // Try to fetch something public or just check auth
        const { data, error } = await supabase.from('user_roles').select('count', { count: 'exact', head: true });

        if (error) {
            console.error('Connection Error:', error.message);
            console.error('Full Error:', error);
        } else {
            console.log('Connection Successful!');
        }
    } catch (err) {
        console.error('Unexpected Error:', err);
    }
}

testConnection();
