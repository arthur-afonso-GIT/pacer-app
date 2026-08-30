import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { isSupabaseConfigured, publicEnv } from './env'

function createConfiguredClient() {
  const { VITE_SUPABASE_URL: url, VITE_SUPABASE_ANON_KEY: anonKey } = publicEnv
  if (!isSupabaseConfigured || !url || !anonKey) return null
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

export const supabase = createConfiguredClient()
