import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/infrastructure/supabase/database.types'

type Client = SupabaseClient<Database>
type NotificationType = Database['public']['Enums']['notification_type']

export interface AppNotification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  createdAt: string
  readAt: string | null
  destination: string | null
}

const asRecord = (value: Json): Record<string, Json | undefined> | null =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value
    : null

const stringValue = (
  record: Record<string, Json | undefined> | null,
  key: string,
) => {
  const value = record?.[key]
  return typeof value === 'string' ? value : null
}

export function notificationDestination(data: Json): string | null {
  const record = asRecord(data)
  const groupId = stringValue(record, 'group_id')
  if (groupId) return `/grupo/${encodeURIComponent(groupId)}`
  const challengeId = stringValue(record, 'challenge_id')
  if (challengeId) return `/desafio/${encodeURIComponent(challengeId)}`
  return null
}

export const createNotificationsRepository = (client: Client) => ({
  async list(userId: string): Promise<AppNotification[]> {
    const { data, error } = await client
      .from('notifications')
      .select('id, type, title, body, data, created_at, read_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)
    if (error) throw error
    return data.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      body: row.body,
      createdAt: row.created_at,
      readAt: row.read_at,
      destination: notificationDestination(row.data),
    }))
  },

  async unreadCount(userId: string): Promise<number> {
    const [{ count, error }, preferences] = await Promise.all([
      client
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('read_at', null),
      client
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', userId)
        .maybeSingle(),
    ])
    if (error) throw error
    if (preferences.error) throw preferences.error
    return preferences.data?.notifications_enabled === false ? 0 : (count ?? 0)
  },

  async markRead(notificationId: string) {
    const { error } = await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .is('read_at', null)
    if (error) throw error
  },

  async markAllRead(userId: string) {
    const { error } = await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null)
    if (error) throw error
  },
})

export type NotificationsRepository = ReturnType<
  typeof createNotificationsRepository
>
