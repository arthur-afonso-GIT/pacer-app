import { queryOptions, useQuery } from '@tanstack/react-query'
import { supabase } from '@/infrastructure/supabase/client'
import { getPeriodRange, type RankingPeriod } from '@/features/rankings/ranking'
import { deriveStatistics } from './statistics'
import { currentDateInTimezone, deriveActivityConsistency } from './consistency'
import type { WeeklyConsistency } from './weekly'

export interface StatisticsQueryInput {
  challengeId: string
  userId: string
  timezone: string
  period: RankingPeriod
}

export const statisticsQueryOptions = (input: StatisticsQueryInput) =>
  queryOptions({
    queryKey: [
      'ledger-statistics',
      input.challengeId,
      input.userId,
      input.period,
      input.timezone,
    ],
    enabled: Boolean(input.challengeId && input.userId),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      let request = supabase
        .from('point_transactions')
        .select('points, created_at')
        .eq('challenge_id', input.challengeId)
        .eq('user_id', input.userId)
      const range = getPeriodRange(input.period, input.timezone)
      if (range)
        request = request
          .gte('created_at', range.from)
          .lt('created_at', range.to)
      const { data, error } = await request
      if (error) throw error
      return deriveStatistics(
        data.map((row) => ({ points: row.points, createdAt: row.created_at })),
      )
    },
    staleTime: 30_000,
  })

export function useStatistics(input: StatisticsQueryInput) {
  return useQuery(statisticsQueryOptions(input))
}

export const activityConsistencyOptions = (
  input: Omit<StatisticsQueryInput, 'period'>,
) =>
  queryOptions({
    queryKey: [
      'activity-consistency',
      input.challengeId,
      input.userId,
      input.timezone,
    ],
    enabled: Boolean(input.challengeId && input.userId),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      const { data, error } = await supabase
        .from('submissions')
        .select('occurred_on')
        .eq('challenge_id', input.challengeId)
        .eq('submitter_id', input.userId)
        .eq('status', 'approved')
      if (error) throw error
      return deriveActivityConsistency(
        data.map((row) => row.occurred_on),
        currentDateInTimezone(input.timezone),
      )
    },
    staleTime: 30_000,
  })

export const useActivityConsistency = (
  input: Omit<StatisticsQueryInput, 'period'>,
) => useQuery(activityConsistencyOptions(input))

export const weeklyConsistencyOptions = (userId: string) =>
  queryOptions({
    queryKey: ['weekly-consistency', userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<WeeklyConsistency[]> => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      const { data, error } = await supabase.rpc('get_my_weekly_consistency')
      if (error) throw error
      return data.map((row) => ({
        groupId: row.group_id,
        groupName: row.group_name,
        timezone: row.timezone,
        weekStart: row.week_start,
        weekEnd: row.week_end,
        activeDays: row.active_days,
        approvedActivities: row.approved_activities,
        netPoints: row.net_points,
        currentStreak: row.current_streak,
      }))
    },
    staleTime: 30_000,
  })

export const useWeeklyConsistency = (userId: string) =>
  useQuery(weeklyConsistencyOptions(userId))
