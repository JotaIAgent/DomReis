import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co'
const supabaseAnonKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod'

console.log('Initializing Supabase client...');
try {
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    console.log('Supabase client initialized successfully.');
} catch (error) {
    console.error('Error initializing Supabase client:', error);
}
