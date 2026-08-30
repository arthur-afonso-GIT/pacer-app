import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/infrastructure/supabase/client'
import type { Database } from '@/infrastructure/supabase/database.types'
import type { AuthCredentials } from './schemas'

type Client = SupabaseClient<Database>

function configured(client: Client | null): Client {
  if (!client)
    throw new Error('O serviço de autenticação não está configurado.')
  return client
}

export async function signIn(
  credentials: AuthCredentials,
  client: Client | null = supabase,
) {
  const { data, error } =
    await configured(client).auth.signInWithPassword(credentials)
  if (error) throw error
  return data
}

export async function signUp(
  credentials: AuthCredentials,
  client: Client | null = supabase,
) {
  const { data, error } = await configured(client).auth.signUp(credentials)
  if (error) throw error
  return data
}

export async function signOut(client: Client | null = supabase) {
  const { error } = await configured(client).auth.signOut()
  if (error) throw error
}
