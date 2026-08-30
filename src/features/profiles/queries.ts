import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProfile, upsertProfile } from './api'
import type { ProfileInput } from './schemas'

export const profileKeys = {
  all: ['profile'] as const,
  detail: (userId: string) => ['profile', userId] as const,
}
export function useProfile(userId: string | undefined) {
  return useQuery({
    queryKey: userId ? profileKeys.detail(userId) : profileKeys.all,
    queryFn: () => (userId ? fetchProfile(userId) : Promise.resolve(null)),
    enabled: Boolean(userId),
  })
}
export function useUpsertProfile(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ProfileInput) => upsertProfile(userId, input),
    onSuccess: (profile) =>
      queryClient.setQueryData(profileKeys.detail(userId), profile),
  })
}
