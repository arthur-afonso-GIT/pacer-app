import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { NotificationsRepository } from './api'
import { todayKeys } from '@/features/today'

export const notificationKeys = {
  all: (userId: string) => ['notifications', userId] as const,
  list: (userId: string) => ['notifications', userId, 'list'] as const,
  unread: (userId: string) => ['notifications', userId, 'unread'] as const,
}

const requireRepository = (repository: NotificationsRepository | null) => {
  if (!repository) throw new Error('Supabase não está configurado.')
  return repository
}

export function useNotifications(
  repository: NotificationsRepository | null,
  userId: string,
) {
  return useQuery({
    queryKey: notificationKeys.list(userId),
    queryFn: () => requireRepository(repository).list(userId),
    enabled: Boolean(repository && userId),
    staleTime: 30_000,
  })
}

export function useUnreadNotificationCount(
  repository: NotificationsRepository | null,
  userId: string,
) {
  return useQuery({
    queryKey: notificationKeys.unread(userId),
    queryFn: () => requireRepository(repository).unreadCount(userId),
    enabled: Boolean(repository && userId),
    staleTime: 30_000,
  })
}

export function useNotificationActions(
  repository: NotificationsRepository,
  userId: string,
) {
  const queryClient = useQueryClient()
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: notificationKeys.all(userId) }),
      queryClient.invalidateQueries({ queryKey: todayKeys.dashboard(userId) }),
    ])
  const markRead = useMutation({
    mutationFn: (notificationId: string) => repository.markRead(notificationId),
    onSuccess: refresh,
  })
  const markAllRead = useMutation({
    mutationFn: () => repository.markAllRead(userId),
    onSuccess: refresh,
  })
  return { markRead, markAllRead }
}
