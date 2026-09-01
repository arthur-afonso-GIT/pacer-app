import { useMemo } from 'react'
import {
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'
import { supabase } from '@/infrastructure/supabase/client'
import { useAuth } from '@/features/auth'
import {
  ChallengeHomePage,
  CreateChallengePage,
  CreateGlobalHabitPage,
  CreateHabitPage,
  createChallengesRepository,
  useActivateChallenge,
  useChallengeDetail,
} from '@/features/challenges'
import {
  LedgerPage,
  RankingHubPage,
  RankingPage,
  useCanManageGroup,
} from '@/features/rankings'
import { createTodayRepository, useTodayDashboard } from '@/features/today'
import { EvidenceReviewPage, ReviewQueuePage } from '@/features/reviews'
import { dateInTimezone, SubmissionPage } from '@/features/submissions'
import {
  CreateGroupPage,
  CreateInvitePage,
  createGroupsRepository,
  GroupsListPage,
  GroupOverviewPage,
  JoinGroupPage,
  useGroupOverview,
  useGroups,
  useCreateGroup,
  useJoinGroup,
  useManageGroupMember,
  useVoteGroupPost,
  useProposeGroupPostPoints,
  useDeleteGroupPost,
  useUpdateGroup,
  useLeaveGroup,
} from '@/features/groups'

function useGroupsRepository() {
  return useMemo(() => {
    if (!supabase) throw new Error('Supabase não está configurado.')
    return createGroupsRepository(supabase)
  }, [])
}

function useChallengesRepository() {
  return useMemo(() => {
    if (!supabase) throw new Error('Supabase não está configurado.')
    return createChallengesRepository(supabase)
  }, [])
}

export function GroupsRoute() {
  const repository = useGroupsRepository()
  const { user } = useAuth()
  const groups = useGroups(repository, user?.id)
  const navigate = useNavigate()
  return (
    <GroupsListPage
      groups={groups.data ?? []}
      loading={groups.isLoading}
      {...(groups.error
        ? { error: 'Não foi possível carregar seus grupos.' }
        : {})}
      onRetry={() => void groups.refetch()}
      onSelect={(id) => {
        void navigate(`/grupo/${id}`)
      }}
      onCreate={() => void navigate('/grupo/criar')}
      onJoin={() => void navigate('/grupo/entrar')}
    />
  )
}

export function GroupOverviewRoute() {
  const { groupId = '' } = useParams()
  const repository = useGroupsRepository()
  const overview = useGroupOverview(repository, groupId)
  const navigate = useNavigate()
  const { user } = useAuth()
  const memberManagement = useManageGroupMember(repository, groupId)
  const postVote = useVoteGroupPost(repository, groupId)
  const pointProposal = useProposeGroupPostPoints(repository, groupId)
  const postDeletion = useDeleteGroupPost(repository)
  const groupUpdate = useUpdateGroup(repository, groupId)
  const groupLeave = useLeaveGroup(repository, groupId)
  if (overview.isLoading) return <p role="status">Carregando grupo…</p>
  if (overview.error || !overview.data) {
    return <p role="alert">Não foi possível carregar este grupo.</p>
  }
  return (
    <GroupOverviewPage
      overview={overview.data}
      {...(user ? { currentUserId: user.id } : {})}
      canManageMembers={overview.data.members.some(
        (member) =>
          member.user_id === user?.id &&
          (member.role === 'owner' || member.role === 'admin'),
      )}
      onChangeRole={(userId, role) => memberManagement.mutate({ userId, role })}
      onRemoveMember={(userId) =>
        memberManagement.mutate({ userId, remove: true })
      }
      onVotePost={(postId, decision) => postVote.mutate({ postId, decision })}
      onDeletePost={(postId) => postDeletion.mutate(postId)}
      onCreateActivity={() =>
        void navigate(`/habitos/criar?grupo=${encodeURIComponent(groupId)}`)
      }
      onUpdateGroup={(input) => groupUpdate.mutate(input)}
      onLeaveGroup={(successorId) =>
        groupLeave.mutate(successorId, {
          onSuccess: () => void navigate('/grupo', { replace: true }),
        })
      }
      groupActionPending={groupUpdate.isPending || groupLeave.isPending}
      {...(groupUpdate.error || groupLeave.error
        ? {
            groupActionError:
              'Não foi possível concluir. Atualize o grupo e tente novamente.',
          }
        : {})}
      {...(groupUpdate.isSuccess
        ? { groupActionSuccess: 'Dados do grupo atualizados.' }
        : {})}
      postActionPending={
        postVote.isPending || pointProposal.isPending || postDeletion.isPending
      }
      {...(postVote.error || pointProposal.error || postDeletion.error
        ? {
            postActionError:
              'Não foi possível concluir a ação. Atualize o grupo e tente novamente; a atividade pode já ter sido resolvida ou excluída.',
          }
        : {})}
      {...(postDeletion.isSuccess
        ? {
            postActionSuccess: postDeletion.data.photoRemoved
              ? 'Atividade excluída de todos os grupos, do calendário e dos rankings.'
              : 'Atividade e pontos excluídos. A limpeza do arquivo da foto falhou; avise o suporte.',
          }
        : {})}
      onProposePostPoints={(postId, points) =>
        pointProposal.mutate({ postId, points })
      }
      {...(overview.data.members.some(
        (member) =>
          member.user_id === user?.id &&
          (member.role === 'owner' || member.role === 'admin'),
      )
        ? {
            onInvite: () => void navigate(`/grupo/${groupId}/convidar`),
            onCreateChallenge: () =>
              void navigate(`/grupo/${groupId}/desafios/criar`),
          }
        : {})}
      onOpenChallenge={(challengeId) => {
        void navigate(`/desafio/${challengeId}`)
      }}
    />
  )
}

export function CreateInviteRoute() {
  const { groupId = '' } = useParams()
  const repository = useGroupsRepository()
  const navigate = useNavigate()
  return (
    <CreateInvitePage
      groupId={groupId}
      createInvite={(input) => repository.createInvite(input)}
      onBack={() => void navigate(`/grupo/${groupId}`)}
    />
  )
}

export function CreateGroupRoute() {
  const repository = useGroupsRepository()
  const navigate = useNavigate()
  const { user } = useAuth()
  const creation = useCreateGroup(repository)
  if (!user) return <Navigate to="/entrar" replace />
  return (
    <CreateGroupPage
      createGroup={(input) => creation.mutateAsync(input)}
      onCreated={(group) => {
        void navigate(`/grupo/${group.id}`)
      }}
    />
  )
}

export function CreateChallengeRoute() {
  const { groupId = '' } = useParams()
  const groupRepository = useGroupsRepository()
  const challengeRepository = useChallengesRepository()
  const overview = useGroupOverview(groupRepository, groupId)
  const navigate = useNavigate()
  const { user } = useAuth()
  if (!user) return <Navigate to="/entrar" replace />
  if (overview.isLoading) return <p role="status">Carregando grupo…</p>
  if (!overview.data) return <p role="alert">Grupo não encontrado.</p>
  return (
    <CreateChallengePage
      groupId={groupId}
      userId={user.id}
      timezone={overview.data.group.timezone}
      createChallenge={(input) => challengeRepository.createChallenge(input)}
      onCreated={(challenge) => {
        void navigate(`/desafio/${challenge.id}/habitos/criar`)
      }}
    />
  )
}

export function CreateHabitRoute() {
  const { challengeId = '' } = useParams()
  const repository = useChallengesRepository()
  const navigate = useNavigate()
  const { user } = useAuth()
  if (!user) return <Navigate to="/entrar" replace />
  return (
    <CreateHabitPage
      challengeId={challengeId}
      userId={user.id}
      createHabit={(input) => repository.createHabit(input)}
      onCreated={() => {
        void navigate(`/desafio/${challengeId}/registrar`)
      }}
    />
  )
}

export function CreateGlobalHabitRoute() {
  const repository = useChallengesRepository()
  const groupsRepository = useGroupsRepository()
  const { user } = useAuth()
  const groups = useGroups(groupsRepository, user?.id)
  const [searchParams] = useSearchParams()
  const requestedGroupId = searchParams.get('grupo')
  return (
    <CreateGlobalHabitPage
      groups={groups.data ?? []}
      groupsLoading={groups.isLoading}
      {...(groups.error
        ? { groupsError: 'Não foi possível carregar seus grupos.' }
        : {})}
      initialGroupIds={requestedGroupId ? [requestedGroupId] : []}
      createHabit={(input) => repository.createGlobalHabit(input)}
    />
  )
}

export function ChallengeHomeRoute() {
  const { challengeId = '' } = useParams()
  const detail = useChallengeDetail(challengeId)
  const navigate = useNavigate()
  const repository = useChallengesRepository()
  const activation = useActivateChallenge(repository)
  const { user } = useAuth()
  if (detail.isLoading) return <p role="status">Carregando desafio…</p>
  if (!detail.data) return <p role="alert">Desafio não encontrado.</p>
  return (
    <ChallengeHomePage
      name={detail.data.challenge.name}
      description={detail.data.challenge.description}
      habitCount={detail.data.habits.length}
      habits={detail.data.habits}
      startsAt={detail.data.challenge.starts_at}
      endsAt={detail.data.challenge.ends_at}
      timezone={detail.data.timezone}
      reviewPolicy={detail.data.challenge.review_policy}
      status={detail.data.effectiveStatus}
      canManage={detail.data.challenge.created_by === user?.id}
      publishing={activation.isPending}
      {...(activation.error
        ? { publishError: 'Não foi possível publicar o desafio.' }
        : {})}
      onPublish={() => activation.mutate(challengeId)}
      onNavigate={(destination) => {
        const paths = {
          submit: `/desafio/${challengeId}/registrar`,
          reviews: `/desafio/${challengeId}/revisoes`,
          ranking: `/desafio/${challengeId}/ranking`,
          habit: `/desafio/${challengeId}/habitos/criar`,
        }
        void navigate(paths[destination])
      }}
    />
  )
}

export function SubmissionRoute() {
  const { challengeId = '' } = useParams()
  const detail = useChallengeDetail(challengeId)
  if (detail.isLoading) return <p role="status">Carregando desafio…</p>
  if (!detail.data) return <p role="alert">Desafio não encontrado.</p>
  if (detail.data.effectiveStatus !== 'active') {
    const message =
      detail.data.effectiveStatus === 'scheduled'
        ? 'Este desafio ainda não começou.'
        : 'O período para registrar atividades neste desafio terminou.'
    return (
      <section className="mx-auto grid max-w-xl gap-3 py-8 text-center">
        <h1 className="text-2xl font-black">Registro indisponível</h1>
        <p role="alert" className="text-secondary">
          {message}
        </p>
      </section>
    )
  }
  return (
    <SubmissionPage
      challengeId={challengeId}
      habits={detail.data.habits}
      today={dateInTimezone(detail.data.timezone)}
    />
  )
}

export function ReviewQueueRoute() {
  const { challengeId = '' } = useParams()
  const navigate = useNavigate()
  return (
    <ReviewQueuePage
      challengeId={challengeId}
      onOpen={(submissionId) => {
        void navigate(`/desafio/${challengeId}/revisoes/${submissionId}`)
      }}
    />
  )
}

export function EvidenceReviewRoute() {
  const { challengeId = '', submissionId = '' } = useParams()
  const navigate = useNavigate()
  return (
    <EvidenceReviewPage
      challengeId={challengeId}
      submissionId={submissionId}
      onReviewed={() => {
        void navigate(`/desafio/${challengeId}/ranking`)
      }}
    />
  )
}

export function RankingRoute() {
  const { challengeId = '' } = useParams()
  const detail = useChallengeDetail(challengeId)
  const { user } = useAuth()
  const navigate = useNavigate()
  const permission = useCanManageGroup(
    detail.data?.challenge.group_id ?? '',
    user?.id ?? '',
  )
  if (detail.isLoading) return <p role="status">Carregando ranking…</p>
  if (!detail.data) return <p role="alert">Desafio não encontrado.</p>
  return (
    <RankingPage
      challengeId={challengeId}
      timezone={detail.data.timezone}
      userId={user?.id ?? ''}
      {...(permission.data
        ? {
            onOpenLedger: () =>
              void navigate(`/desafio/${challengeId}/lancamentos`),
          }
        : {})}
    />
  )
}

export function LedgerRoute() {
  const { challengeId = '' } = useParams()
  const detail = useChallengeDetail(challengeId)
  const { user } = useAuth()
  if (detail.isLoading) return <p role="status">Carregando lançamentos…</p>
  if (!detail.data) return <p role="alert">Desafio não encontrado.</p>
  return (
    <LedgerPage
      challengeId={challengeId}
      groupId={detail.data.challenge.group_id}
      userId={user?.id ?? ''}
    />
  )
}

export function RankingHubRoute() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repository = useMemo(() => {
    if (!supabase) throw new Error('Supabase não está configurado.')
    return createTodayRepository(supabase)
  }, [])
  const dashboard = useTodayDashboard(repository, user?.id ?? '')
  return (
    <RankingHubPage
      {...(dashboard.data ? { challenges: dashboard.data.challenges } : {})}
      loading={dashboard.isLoading}
      {...(dashboard.error instanceof Error
        ? { error: dashboard.error.message }
        : {})}
      onRetry={() => void dashboard.refetch()}
      onOpen={(id) => void navigate(`/desafio/${id}/ranking`)}
      onOpenGroups={() => void navigate('/grupo')}
    />
  )
}

export function JoinGroupRoute() {
  const repository = useGroupsRepository()
  const navigate = useNavigate()
  const join = useJoinGroup(repository)
  return (
    <JoinGroupPage
      joinByCode={(code) => join.mutateAsync(code)}
      onJoined={(groupId) => {
        void navigate(`/grupo/${groupId}`)
      }}
    />
  )
}
