import { supabase } from './src/lib/supabase.js';

async function testUser() {
    console.log('Testing Supabase getUser...');
    try {
        const result = await supabase.auth.getUser();
        console.log('Result:', JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Error:', error);
    }
}

testUser();
