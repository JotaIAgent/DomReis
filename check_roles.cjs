const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co';
const supabaseKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    console.log('Checking user_roles table...');

    const userId = 'e000fc5f-02f3-40ba-a2d8-fd1811d3cb06';

    // Check all records for this user
    const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId);

    console.log('Results:', data);
    console.log('Error:', error);
    console.log('Count:', data?.length);
}

checkRoles();
