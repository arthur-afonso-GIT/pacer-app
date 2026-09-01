import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  ChallengesRepository,
  CreateChallengeInvitesInput,
  CreateChallengeInput,
  CreateHabitInput,
} from './api'

export const challengeHubKey = ['challenge-hub'] as const
export const challengeFeedKey = (challengeId: string) =>
  ['challenge-feed', challengeId] as const

export const useChallengeHub = (
  repo: Pick<ChallengesRepository, 'listHub'>,
  userId?: string,
) =>
  useQuery({
    queryKey: [...challengeHubKey, userId],
    queryFn: () => repo.listHub(),
    enabled: Boolean(userId),
  })

export const useCreateChallengeInvites = (
  repo: Pick<ChallengesRepository, 'createChallengeInvites'>,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateChallengeInvitesInput) =>
      repo.createChallengeInvites(input),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: challengeHubKey }),
        qc.invalidateQueries({ queryKey: ['groups'] }),
        qc.invalidateQueries({ queryKey: ['notifications'] }),
      ]),
  })
}

export const useJoinChallenge = (
  repo: Pick<ChallengesRepository, 'joinChallenge'>,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (challengeId: string) => repo.joinChallenge(challengeId),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: challengeHubKey }),
        qc.invalidateQueries({ queryKey: ['today'] }),
      ]),
  })
}

export const useChallengeActivityFeed = (
  repo: Pick<ChallengesRepository, 'challengeFeed'>,
  challengeId: string,
) =>
  useQuery({
    queryKey: challengeFeedKey(challengeId),
    queryFn: () => repo.challengeFeed(challengeId),
    enabled: Boolean(challengeId),
  })

export const useVoteChallengePost = (
  repo: Pick<ChallengesRepository, 'voteChallengePost'>,
  challengeId: string,
  groupId: string,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      postId: string
      decision: 'approved' | 'rejected'
    }) =>
      repo.voteChallengePost(
        challengeId,
        groupId,
        input.postId,
        input.decision,
      ),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: challengeFeedKey(challengeId) }),
        qc.invalidateQueries({ queryKey: ['ranking'] }),
        qc.invalidateQueries({ queryKey: ['calendar'] }),
      ]),
  })
}
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
