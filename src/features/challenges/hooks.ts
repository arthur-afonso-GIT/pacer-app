import { useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  ChallengesRepository,
  CreateChallengeInput,
  CreateHabitInput,
} from './api'
export const challengeKeys = {
  group: (id: string) => ['groups', id, 'challenges'] as const,
  detail: (id: string) => ['challenges', id] as const,
}
export const useCreateChallenge = (
  repo: Pick<ChallengesRepository, 'createChallenge'>,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChallengeInput) => repo.createChallenge(input),
    onSuccess: (challenge) => {
      void qc.invalidateQueries({
        queryKey: challengeKeys.group(challenge.group_id),
      })
    },
  })
}
export const useCreateHabit = (
  repo: Pick<ChallengesRepository, 'createHabit'>,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateHabitInput) => repo.createHabit(input),
    onSuccess: (_, input) => {
      void qc.invalidateQueries({
        queryKey: challengeKeys.detail(input.challengeId),
      })
    },
  })
}

export const useActivateChallenge = (
  repo: Pick<ChallengesRepository, 'activateChallenge'>,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (challengeId: string) => repo.activateChallenge(challengeId),
    onSuccess: (challenge) =>
      qc.invalidateQueries({ queryKey: challengeKeys.detail(challenge.id) }),
  })
}
