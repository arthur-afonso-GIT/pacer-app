import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/infrastructure/supabase/database.types'

type Client = SupabaseClient<Database>

interface TodayMembershipRow {
  challenge_id: string
  challenges: {
    id: string
    name: string
    status: Database['public']['Enums']['challenge_status']
    starts_at: string
    ends_at: string
    groups: { name: string; timezone: string } | null
    challenge_habits: Array<{
      id: string
      points: number
      habits: { name: string } | null
    }>
  } | null
}

interface TodaySubmissionRow {
  id: string
  challenge_id: string
  status: Database['public']['Enums']['submission_status']
  submitted_at: string
  occurred_on: string
  challenge_habits: { habits: { name: string } | null } | null
}

export interface TodayChallenge {
  id: string
  name: string
  groupName: string
  timezone: string
  endsAt: string
  habits: Array<{ id: string; name: string; points: number }>
}

export interface TodaySubmission {
  id: string
  challengeId: string
  habitName: string
  status: Database['public']['Enums']['submission_status']
  submittedAt: string
  occurredOn: string
}

export interface TodayDashboard {
  challenges: TodayChallenge[]
  recentSubmissions: TodaySubmission[]
  notifications: TodayNotification[]
}

export interface TodayNotification {
  id: string
  title: string
  body: string | null
  createdAt: string
  read: boolean
}

export function mapTodayChallenges(
  rows: readonly TodayMembershipRow[],
  now = new Date(),
): TodayChallenge[] {
  const instant = now.getTime()
  return rows.flatMap((membership) => {
    const challenge = membership.challenges
    if (
      challenge?.status !== 'active' ||
      new Date(challenge.starts_at).getTime() > instant ||
      new Date(challenge.ends_at).getTime() <= instant
    ) {
      return []
    }
    return [
      {
        id: challenge.id,
        name: challenge.name,
        groupName: challenge.groups?.name ?? 'Seu grupo',
        timezone: challenge.groups?.timezone ?? 'UTC',
        endsAt: challenge.ends_at,
        habits: challenge.challenge_habits.flatMap((item) =>
          item.habits
            ? [{ id: item.id, name: item.habits.name, points: item.points }]
            : [],
        ),
      },
    ]
  })
}

export function mapTodaySubmissions(
  rows: readonly TodaySubmissionRow[],
): TodaySubmission[] {
  return rows.map((row) => ({
    id: row.id,
    challengeId: row.challenge_id,
    habitName: row.challenge_habits?.habits?.name ?? 'Atividade',
    status: row.status,
    submittedAt: row.submitted_at,
    occurredOn: row.occurred_on,
  }))
}

export const createTodayRepository = (client: Client) => ({
  async fetch(userId: string): Promise<TodayDashboard> {
    const [
      membershipsResult,
      submissionsResult,
      notificationsResult,
      preferencesResult,
    ] = await Promise.all([
      client
        .from('challenge_members')
        .select(
          'challenge_id, challenges(id, name, status, starts_at, ends_at, groups(name, timezone), challenge_habits(id, points, habits(name)))',
        )
        .eq('user_id', userId)
        .eq('status', 'active'),
      client
        .from('submissions')
        .select(
          'id, challenge_id, status, submitted_at, occurred_on, challenge_habits(habits(name))',
        )
        .eq('submitter_id', userId)
        .order('submitted_at', { ascending: false })
        .limit(5),
      client
        .from('notifications')
        .select('id, title, body, created_at, read_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      client
        .from('profiles')
        .select('notifications_enabled')
        .eq('id', userId)
        .maybeSingle(),
    ])
    if (membershipsResult.error) throw membershipsResult.error
    if (submissionsResult.error) throw submissionsResult.error
    if (notificationsResult.error) throw notificationsResult.error
    if (preferencesResult.error) throw preferencesResult.error
    return {
      challenges: mapTodayChallenges(membershipsResult.data),
      recentSubmissions: mapTodaySubmissions(submissionsResult.data),
      notifications:
        preferencesResult.data?.notifications_enabled === false
          ? []
          : notificationsResult.data.map((row) => ({
              id: row.id,
              title: row.title,
              body: row.body,
              createdAt: row.created_at,
              read: row.read_at !== null,
            })),
    }
  },
  async markNotificationRead(notificationId: string) {
    const { error } = await client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
    if (error) throw error
  },
})

export type TodayRepository = ReturnType<typeof createTodayRepository>
