import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/infrastructure/supabase/database.types'
import { calendarMonthRange, type CalendarMonth } from './calendar'

type Client = SupabaseClient<Database>

export interface CalendarEntry {
  source?: 'submission' | 'post'
  id: string
  occurredOn: string
  submittedAt: string
  resolvedAt?: string | null
  status: Database['public']['Enums']['submission_status']
  habitName: string
  challengeName: string
  groupName: string
  timezone: string
}

interface CalendarRow {
  id: string
  occurred_on: string
  submitted_at: string
  resolved_at: string | null
  status: Database['public']['Enums']['submission_status']
  challenge_habits: {
    habits: { name: string } | null
    challenges: {
      name: string
      groups: { name: string; timezone: string } | null
    } | null
  } | null
}

export const createCalendarRepository = (client: Client) => ({
  async listMonth(
    userId: string,
    month: CalendarMonth,
  ): Promise<CalendarEntry[]> {
    const range = calendarMonthRange(month)
    const { data, error } = await client
      .from('submissions')
      .select(
        'id, occurred_on, submitted_at, resolved_at, status, challenge_habits(habits(name), challenges(name, groups(name, timezone)))',
      )
      .eq('submitter_id', userId)
      .gte('occurred_on', range.from)
      .lt('occurred_on', range.to)
      .order('occurred_on', { ascending: false })
      .order('submitted_at', { ascending: false })
    if (error) throw error
    const rows = data as unknown as CalendarRow[]
    const submissions: CalendarEntry[] = rows.map((row) => {
      const challenge = row.challenge_habits?.challenges
      return {
        id: row.id,
        occurredOn: row.occurred_on,
        submittedAt: row.submitted_at,
        resolvedAt: row.resolved_at,
        status: row.status,
        habitName: row.challenge_habits?.habits?.name ?? 'Atividade',
        challengeName: challenge?.name ?? 'Desafio',
        groupName: challenge?.groups?.name ?? 'Seu grupo',
        timezone: challenge?.groups?.timezone ?? 'UTC',
      }
    })
    const posts = await client.rpc('get_my_activity_calendar', {
      p_from: range.from,
      p_to: range.to,
    })
    if (posts.error) throw posts.error
    return [
      ...submissions,
      ...posts.data.map((post): CalendarEntry => ({
        id: `${post.post_id}:${post.group_id}`,
        source: 'post',
        occurredOn: post.occurred_on,
        submittedAt: post.submitted_at,
        resolvedAt: post.resolved_at,
        status: post.status,
        habitName: post.activity_name,
        challengeName: 'Post no feed',
        groupName: post.group_name,
        timezone: post.timezone,
      })),
    ].sort(
      (a, b) =>
        b.occurredOn.localeCompare(a.occurredOn) ||
        b.submittedAt.localeCompare(a.submittedAt),
    )
  },
  async cancelSubmission(submissionId: string) {
    const { data, error } = await client.rpc('cancel_submission', {
      p_submission_id: submissionId,
      p_reason: 'Cancelada pelo participante no calendário',
    })
    if (error) throw error
    return data
  },
  async disputeSubmission(submissionId: string, reason: string) {
    const { data, error } = await client.rpc('dispute_submission', {
      p_submission_id: submissionId,
      p_reason: reason,
    })
    if (error) throw error
    return data
  },
})

export type CalendarRepository = ReturnType<typeof createCalendarRepository>
