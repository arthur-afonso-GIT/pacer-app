import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/infrastructure/supabase/client'
import type { Database } from '@/infrastructure/supabase/database.types'
import type { RankingPeriod } from './ranking'

export interface RankingQueryInput {
  challengeId: string
  timezone: string
  period: RankingPeriod
}

export const rankingQueryOptions = ({
  challengeId,
  timezone,
  period,
}: RankingQueryInput) =>
  queryOptions({
    queryKey: ['ranking', challengeId, period, timezone],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não está configurado.')

      const { data, error } = await supabase.rpc('get_challenge_ranking', {
        p_challenge_id: challengeId,
        p_period: period,
      })
      if (error) throw error
      return data.map((row) => ({
        userId: row.user_id,
        displayName: row.display_name,
        avatarUrl: row.avatar_url,
        points: row.points,
        rank: row.rank,
      }))
    },
    staleTime: 30_000,
  })

export function useRanking(input: RankingQueryInput) {
  return useQuery(rankingQueryOptions(input))
}

export interface LedgerEntry {
  id: string
  userId: string
  displayName: string
  kind: Database['public']['Enums']['point_transaction_kind']
  points: number
  reason: string | null
  createdAt: string
  reversed: boolean
}

interface LedgerRow {
  id: string
  user_id: string
  kind: Database['public']['Enums']['point_transaction_kind']
  points: number
  reason: string | null
  created_at: string
  reverses_transaction_id: string | null
  profiles: { display_name: string } | null
}

export const useCanManageGroup = (groupId: string, userId: string) =>
  useQuery({
    queryKey: ['groups', groupId, 'can-manage', userId],
    enabled: Boolean(groupId && userId),
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      const { data, error } = await supabase
        .from('group_members')
        .select('role, status')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      return (
        data?.status === 'active' &&
        (data.role === 'admin' || data.role === 'owner')
      )
    },
  })

export const useChallengeLedger = (challengeId: string, enabled: boolean) =>
  useQuery({
    queryKey: ['ledger', challengeId],
    enabled: Boolean(challengeId && enabled),
    queryFn: async (): Promise<LedgerEntry[]> => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      const { data, error } = await supabase
        .from('point_transactions')
        .select(
          'id, user_id, kind, points, reason, created_at, reverses_transaction_id, profiles!point_transactions_user_id_fkey(display_name)',
        )
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data as unknown as LedgerRow[]
      const reversedIds = new Set(
        rows.flatMap((row) =>
          row.reverses_transaction_id ? [row.reverses_transaction_id] : [],
        ),
      )
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        displayName: row.profiles?.display_name ?? 'Participante',
        kind: row.kind,
        points: row.points,
        reason: row.reason,
        createdAt: row.created_at,
        reversed: reversedIds.has(row.id),
      }))
    },
  })

export const useReversePoints = (challengeId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      transactionId,
      reason,
    }: {
      transactionId: string
      reason: string
    }) => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      const { data, error } = await supabase.rpc('reverse_point_transaction', {
        p_transaction_id: transactionId,
        p_reason: reason,
      })
      if (error) throw error
      return data
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ledger', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['ranking', challengeId] }),
        queryClient.invalidateQueries({
          queryKey: ['ledger-statistics', challengeId],
        }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
      ]),
  })
}

export const useCorrectPoints = (challengeId: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      transactionId,
      correctedPoints,
      reason,
    }: {
      transactionId: string
      correctedPoints: number
      reason: string
    }) => {
      if (!supabase) throw new Error('Supabase não está configurado.')
      const { data, error } = await supabase.rpc('correct_point_transaction', {
        p_transaction_id: transactionId,
        p_corrected_points: correctedPoints,
        p_reason: reason,
      })
      if (error) throw error
      return data
    },
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ledger', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['ranking', challengeId] }),
        queryClient.invalidateQueries({
          queryKey: ['ledger-statistics', challengeId],
        }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      ]),
  })
}
