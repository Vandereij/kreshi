// src/lib/supabaseClient.ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
let _client: SupabaseClient | null = null
export function browserSupabase(): SupabaseClient {
  if (typeof window === 'undefined') throw new Error('browserSupabase() cannot be used during SSR')
  if (_client) return _client
  _client = createClient(import.meta.env.PUBLIC_SUPABASE_URL!, import.meta.env.PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  })
  return _client
}
