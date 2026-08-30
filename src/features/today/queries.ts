import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TodayRepository } from './api'

export const todayKeys = {
  dashboard: (userId: string) => ['today', userId] as const,
}

export function useTodayDashboard(repository: TodayRepository, userId: string) {
  return useQuery({
    queryKey: todayKeys.dashboard(userId),
    queryFn: () => repository.fetch(userId),
    enabled: Boolean(userId),
    staleTime: 30_000,
  })
}

export function useMarkNotificationRead(
  repository: TodayRepository,
  userId: string,
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationId: string) =>
      repository.markNotificationRead(notificationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: todayKeys.dashboard(userId) }),
  })
}
