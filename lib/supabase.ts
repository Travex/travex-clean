import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

console.log('✅ SUPABASE URL:', supabaseUrl)
console.log('✅ SUPABASE KEY length:', supabaseAnonKey.length)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
