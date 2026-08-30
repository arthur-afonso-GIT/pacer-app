import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateGroupInput,
  CreateInviteInput,
  GroupsRepository,
} from './api'

export const groupKeys = {
  all: ['groups'] as const,
  detail: (id: string) => ['groups', id] as const,
}
export const useGroups = (repo: GroupsRepository, userId?: string) =>
  useQuery({
    queryKey: userId ? [...groupKeys.all, userId] : groupKeys.all,
    queryFn: () => repo.list(),
    enabled: Boolean(userId),
  })
export const useGroupOverview = (repo: GroupsRepository, groupId: string) =>
  useQuery({
    queryKey: groupKeys.detail(groupId),
    queryFn: () => repo.overview(groupId),
    enabled: Boolean(groupId),
  })
export const useCreateGroup = (repo: Pick<GroupsRepository, 'create'>) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateGroupInput) => repo.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  })
}
export const useCreateInvite = (repo: Pick<GroupsRepository, 'createInvite'>) =>
  useMutation({
    mutationFn: (input: CreateInviteInput) => repo.createInvite(input),
  })
export const useJoinGroup = (repo: Pick<GroupsRepository, 'joinByCode'>) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: repo.joinByCode,
    onSuccess: () => qc.invalidateQueries({ queryKey: groupKeys.all }),
  })
}
export const useManageGroupMember = (
  repo: Pick<GroupsRepository, 'setMemberRole' | 'removeMember'>,
  groupId: string,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      userId: string
      role?: 'member' | 'admin'
      remove?: boolean
    }) =>
      input.remove
        ? repo.removeMember(groupId, input.userId)
        : repo.setMemberRole(groupId, input.userId, input.role ?? 'member'),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
  })
}

export const useVoteGroupPost = (
  repo: Pick<GroupsRepository, 'votePost'>,
  groupId: string,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      postId,
      decision,
    }: {
      postId: string
      decision: 'approved' | 'rejected'
    }) => repo.votePost(groupId, postId, decision),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
        qc.invalidateQueries({ queryKey: ['calendar'] }),
      ]),
  })
}

export const useProposeGroupPostPoints = (
  repo: Pick<GroupsRepository, 'proposePostPoints'>,
  groupId: string,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, points }: { postId: string; points: number }) =>
      repo.proposePostPoints(groupId, postId, points),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: groupKeys.detail(groupId) }),
        qc.invalidateQueries({ queryKey: ['calendar'] }),
      ]),
  })
}

export const useDeleteGroupPost = (
  repo: Pick<GroupsRepository, 'deletePost'>,
) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => repo.deletePost(postId),
    onSuccess: () =>
      Promise.all([
        qc.invalidateQueries({ queryKey: ['groups'] }),
        qc.invalidateQueries({ queryKey: ['calendar'] }),
        qc.invalidateQueries({ queryKey: ['today'] }),
        qc.invalidateQueries({ queryKey: ['ranking'] }),
      ]),
  })
}
