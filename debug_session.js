import { supabase } from './src/lib/supabase.js';

async function testSession() {
    console.log('Testing Supabase session...');
    try {
        const result = await supabase.auth.getSession();
        console.log('Result:', JSON.stringify(result, null, 2));

        const { data } = result;
        if (!data) {
            console.error('Data is null/undefined!');
        } else {
            console.log('Data session:', data.session);
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testSession();
