import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CalendarEntry, CalendarRepository } from './api'
import type { CalendarMonth } from './calendar'

export function useCalendarMonth(
  repository: CalendarRepository,
  userId: string,
  month: CalendarMonth,
) {
  return useQuery({
    queryKey: ['calendar', userId, month.year, month.month],
    queryFn: () => repository.listMonth(userId, month),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useCancelCalendarSubmission(repository: CalendarRepository) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (submissionId: string) =>
      repository.cancelSubmission(submissionId),
    onMutate: async (submissionId) => {
      await queryClient.cancelQueries({ queryKey: ['calendar'] })
      const snapshots = queryClient.getQueriesData<CalendarEntry[]>({
        queryKey: ['calendar'],
      })
      queryClient.setQueriesData<CalendarEntry[]>(
        { queryKey: ['calendar'] },
        (entries) =>
          entries?.map((entry) =>
            entry.id === submissionId
              ? { ...entry, status: 'cancelled' as const }
              : entry,
          ),
      )
      return { snapshots }
    },
    onError: (_error, _submissionId, context) => {
      for (const [key, data] of context?.snapshots ?? [])
        queryClient.setQueryData(key, data)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
      ]),
  })
}

export function useDisputeCalendarSubmission(repository: CalendarRepository) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      submissionId,
      reason,
    }: {
      submissionId: string
      reason: string
    }) => repository.disputeSubmission(submissionId, reason),
    onMutate: async ({ submissionId }) => {
      await queryClient.cancelQueries({ queryKey: ['calendar'] })
      const snapshots = queryClient.getQueriesData<CalendarEntry[]>({
        queryKey: ['calendar'],
      })
      queryClient.setQueriesData<CalendarEntry[]>(
        { queryKey: ['calendar'] },
        (entries) =>
          entries?.map((entry) =>
            entry.id === submissionId
              ? { ...entry, status: 'disputed' as const }
              : entry,
          ),
      )
      return { snapshots }
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? [])
        queryClient.setQueryData(key, data)
    },
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['reviews'] }),
      ]),
  })
}
