import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://afxubhqviwuhcpoktnam.supabase.co'
const supabaseAnonKey = 'sb_publishable_crCNrzcyIUI5rWzFD9fCPQ_7VhTeiod'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
