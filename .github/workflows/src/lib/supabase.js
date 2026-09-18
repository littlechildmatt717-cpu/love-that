import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = 'https://igsucrszgotwrifbrvxd.supabase.co'
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_8wR49vTI4RO90t9ctzq8uA_ApfidSbJ'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
})
