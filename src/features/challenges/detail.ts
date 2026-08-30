import { queryOptions, useQuery } from '@tanstack/react-query'
import { supabase } from '@/infrastructure/supabase/client'

interface ChallengeHabitRow {
  id: string
  points: number
  max_submissions_per_day: number
  habits: { name: string } | null
}

export type EffectiveChallengeStatus =
  'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled'

export function getEffectiveChallengeStatus(
  challenge: {
    status: 'draft' | 'active' | 'completed' | 'cancelled'
    starts_at: string
    ends_at: string
  },
  now = new Date(),
): EffectiveChallengeStatus {
  if (challenge.status !== 'active') return challenge.status
  const instant = now.getTime()
  if (instant < new Date(challenge.starts_at).getTime()) return 'scheduled'
  if (instant >= new Date(challenge.ends_at).getTime()) return 'completed'
  return 'active'
}

export function mapChallengeHabitOptions(rows: ChallengeHabitRow[]) {
  return rows.flatMap((row) =>
    row.habits
      ? [
          {
            id: row.id,
            name: row.habits.name,
            points: row.points,
            maxSubmissionsPerDay: row.max_submissions_per_day,
          },
        ]
      : [],
  )
}

export const challengeDetailOptions = (challengeId: string) =>
  queryOptions({
    queryKey: ['challenges', challengeId, 'detail'],
    enabled: Boolean(challengeId),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      const [challengeResult, habitsResult] = await Promise.all([
        supabase
          .from('challenges')
          .select('*, groups(timezone)')
          .eq('id', challengeId)
          .single(),
        supabase
          .from('challenge_habits')
          .select('id, points, max_submissions_per_day, habits(name)')
          .eq('challenge_id', challengeId),
      ])
      if (challengeResult.error) throw challengeResult.error
      if (habitsResult.error) throw habitsResult.error
      return {
        challenge: challengeResult.data,
        effectiveStatus: getEffectiveChallengeStatus(challengeResult.data),
        timezone: challengeResult.data.groups.timezone,
        habits: mapChallengeHabitOptions(habitsResult.data),
      }
    },
  })

export function useChallengeDetail(challengeId: string) {
  return useQuery(challengeDetailOptions(challengeId))
}
