import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/infrastructure/supabase/client'
import type { Database } from '@/infrastructure/supabase/database.types'
import type { ProfileInput } from './schemas'

export type Profile = Database['public']['Tables']['profiles']['Row']
type Client = SupabaseClient<Database>
export const PROFILE_AVATAR_BUCKET = 'avatars'
export const MAX_PROFILE_AVATAR_BYTES = 5 * 1024 * 1024
export const PROFILE_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export function validateProfileAvatar(file: File) {
  if (!PROFILE_AVATAR_TYPES.some((type) => type === file.type))
    throw new Error('Escolha uma imagem JPEG, PNG ou WebP.')
  if (file.size === 0) throw new Error('A imagem selecionada está vazia.')
  if (file.size > MAX_PROFILE_AVATAR_BYTES)
    throw new Error('A foto deve ter no máximo 5 MB.')
}
function configured(client: Client | null): Client {
  if (!client) throw new Error('O serviço de perfis não está configurado.')
  return client
}
export async function fetchProfile(
  userId: string,
  client: Client | null = supabase,
): Promise<Profile | null> {
  const { data, error } = await configured(client)
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}
export async function upsertProfile(
  _userId: string,
  input: ProfileInput,
  client: Client | null = supabase,
): Promise<Profile> {
  const { data, error } = await configured(client).rpc('save_profile', {
    p_display_name: input.displayName,
    p_avatar_url: input.avatarUrl ?? '',
    p_theme_preference: input.themePreference,
    p_notifications_enabled: input.notificationsEnabled,
  })
  if (error) throw error
  return data
}

export async function uploadProfileAvatar(
  userId: string,
  file: File,
  client: Client | null = supabase,
): Promise<string> {
  validateProfileAvatar(file)
  const service = configured(client)
  const path = `${userId}/avatar`
  const { error } = await service.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, file, {
      contentType: file.type,
      cacheControl: '0',
      upsert: true,
    })
  if (error) throw error
  const { data } = service.storage
    .from(PROFILE_AVATAR_BUCKET)
    .getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}
