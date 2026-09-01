import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import * as Tabs from '@radix-ui/react-tabs'
import { GroupLeaderboard } from './GroupLeaderboard'
import {
  Badge,
  Button,
  Avatar,
  EmptyState,
  Input,
  Surface,
  Textarea,
} from '@/design-system'
import type {
  CreateGroupInput,
  CreateInviteInput,
  Group,
  GroupOverview,
} from './api'
import {
  groupSchema,
  inviteCodeSchema,
  inviteSchema,
  type GroupFormValues,
  type InviteFormValues,
} from './schemas'

const groupEventDateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const Page = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
    <h1 className="text-3xl font-black tracking-tight">{title}</h1>
    {children}
  </section>
)
const Message = ({
  error,
  success,
}: {
  error: unknown
  success: string | undefined
}) =>
  error ? (
    <p role="alert" className="text-sm text-red-700">
      {error instanceof Error ? error.message : 'Não foi possível concluir.'}
    </p>
  ) : success ? (
    <p role="status" className="text-sm font-bold text-emerald-700">
      {success}
    </p>
  ) : null
const fieldError = (error?: string) => (error ? { error } : {})

export function GroupsListPage({
  groups,
  loading = false,
  error,
  onRetry,
  onSelect,
  onCreate,
  onJoin,
}: {
  groups?: Group[]
  loading?: boolean
  error?: string
  onRetry?: () => void
  onSelect?: (id: string) => void
  onCreate?: () => void
  onJoin?: () => void
}) {
  return (
    <Page title="Seus grupos">
      {(onCreate || onJoin) && (
        <div className="grid grid-cols-2 gap-2">
          {onCreate && (
            <Button type="button" onClick={onCreate}>
              Criar grupo
            </Button>
          )}
          {onJoin && (
            <Button type="button" variant="secondary" onClick={onJoin}>
              Entrar com convite
            </Button>
          )}
        </div>
      )}
      {loading ? (
        <p>Carregando grupos…</p>
      ) : error ? (
        <Surface className="grid gap-3 p-4">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          {onRetry && (
            <Button type="button" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </Surface>
      ) : !groups?.length ? (
        <EmptyState
          title="Nenhum grupo ainda"
          description="Crie um grupo ou entre com um código de convite."
          action={
            onCreate ? (
              <Button type="button" variant="ghost" onClick={onCreate}>
                Criar meu primeiro grupo
              </Button>
            ) : undefined
          }
        />
      ) : (
        groups.map((group) => (
          <Surface as="article" key={group.id} className="grid gap-2 p-4">
            <h2 className="text-lg font-black">{group.name}</h2>
            <p className="text-secondary text-sm">
              {group.description || 'Sem descrição'} · {group.timezone}
            </p>
            {onSelect && (
              <Button variant="secondary" onClick={() => onSelect(group.id)}>
                Ver grupo
              </Button>
            )}
          </Surface>
        ))
      )}
    </Page>
  )
}

export function CreateGroupPage({
  createGroup,
  onCreated,
}: {
  createGroup: (input: CreateGroupInput) => Promise<Group>
  onCreated?: (group: Group) => void
}) {
  const mutation = useMutation({
    mutationFn: createGroup,
    ...(onCreated ? { onSuccess: onCreated } : {}),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: '',
      description: '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    },
  })
  return (
    <Page title="Criar grupo">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit((values) =>
            mutation.mutate({
              ...values,
              ...(values.description
                ? { description: values.description }
                : {}),
            }),
          )(event)
        }}
      >
        <Input
          label="Nome do grupo"
          {...fieldError(errors.name?.message)}
          {...register('name')}
        />
        <Textarea
          label="Descrição"
          {...fieldError(errors.description?.message)}
          {...register('description')}
        />
        <Input
          label="Fuso horário"
          hint="Ex.: America/Sao_Paulo"
          {...fieldError(errors.timezone?.message)}
          {...register('timezone')}
        />
        <Button type="submit" fullWidth loading={mutation.isPending}>
          Criar grupo
        </Button>
        <Message
          error={mutation.error}
          success={mutation.isSuccess ? 'Grupo criado.' : undefined}
        />
      </form>
    </Page>
  )
}

export function CreateInvitePage({
  groupId,
  createInvite,
  onBack,
}: {
  groupId: string
  createInvite: (input: CreateInviteInput) => Promise<string>
  onBack?: () => void
}) {
  const mutation = useMutation({ mutationFn: createInvite })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'member', expiresInDays: 7 },
  })
  return (
    <Page title="Convidar pessoa">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit((values) =>
            mutation.mutate({
              ...values,
              ...(values.email ? { email: values.email } : {}),
              groupId,
            }),
          )(event)
        }}
      >
        <Input
          label="E-mail (opcional)"
          type="email"
          {...fieldError(errors.email?.message)}
          {...register('email')}
        />
        <label className="grid gap-1 text-sm font-bold">
          Papel
          <select
            className="min-h-12 rounded-xl border px-3"
            {...register('role')}
          >
            <option value="member">Membro</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <Input
          label="Validade em dias"
          type="number"
          min={1}
          max={30}
          {...fieldError(errors.expiresInDays?.message)}
          {...register('expiresInDays', { valueAsNumber: true })}
        />
        <Button type="submit" fullWidth loading={mutation.isPending}>
          Gerar convite
        </Button>
        <Message error={mutation.error} success={undefined} />
        {mutation.data && (
          <Surface className="grid gap-2 p-4">
            <strong>Código do convite</strong>
            <output className="font-mono break-all">{mutation.data}</output>
            <small>
              Copie agora: por segurança, o código não será exibido novamente.
            </small>
          </Surface>
        )}
        {onBack && (
          <Button type="button" variant="ghost" fullWidth onClick={onBack}>
            Voltar ao grupo
          </Button>
        )}
      </form>
    </Page>
  )
}

export function JoinGroupPage({
  joinByCode,
  onJoined,
}: {
  joinByCode: (code: string) => Promise<string>
  onJoined?: (groupId: string) => void
}) {
  const mutation = useMutation({
    mutationFn: joinByCode,
    ...(onJoined ? { onSuccess: onJoined } : {}),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ code: string }>({
    resolver: zodResolver(inviteCodeSchema),
    defaultValues: { code: '' },
  })
  return (
    <Page title="Entrar em um grupo">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit(({ code }) => mutation.mutate(code.trim()))(event)
        }}
      >
        <Input
          label="Código do convite"
          autoCapitalize="off"
          autoCorrect="off"
          {...fieldError(errors.code?.message)}
          {...register('code')}
        />
        <Button type="submit" fullWidth loading={mutation.isPending}>
          Entrar no grupo
        </Button>
        <Message
          error={mutation.error}
          success={mutation.isSuccess ? 'Você entrou no grupo.' : undefined}
        />
      </form>
    </Page>
  )
}

export function GroupOverviewPage({
  overview,
  onCreateChallenge,
  onInvite,
  onOpenChallenge,
  currentUserId,
  canManageMembers = false,
  onChangeRole,
  onRemoveMember,
  onVotePost,
  onProposePostPoints,
  onDeletePost,
  postActionPending = false,
  postActionError,
  postActionSuccess,
  onUpdateGroup,
  onLeaveGroup,
  groupActionPending = false,
  groupActionError,
  groupActionSuccess,
  onCreateActivity,
  onJoinChallenge,
}: {
  overview: GroupOverview
  onCreateChallenge?: () => void
  onInvite?: () => void
  onOpenChallenge?: (challengeId: string) => void
  currentUserId?: string
  canManageMembers?: boolean
  onChangeRole?: (userId: string, role: 'member' | 'admin') => void
  onRemoveMember?: (userId: string) => void
  onVotePost?: (postId: string, decision: 'approved' | 'rejected') => void
  onProposePostPoints?: (postId: string, points: number) => void
  onDeletePost?: (postId: string) => void
  postActionPending?: boolean
  postActionError?: string
  postActionSuccess?: string
  onUpdateGroup?: (input: CreateGroupInput) => void
  onLeaveGroup?: (successorId?: string) => void
  groupActionPending?: boolean
  groupActionError?: string
  groupActionSuccess?: string
  onCreateActivity?: () => void
  onJoinChallenge?: (challengeId: string) => void
}) {
  const [deleteCandidate, setDeleteCandidate] = useState<string>()
  const [rejectCandidate, setRejectCandidate] = useState<string>()
  const [leaveConfirmation, setLeaveConfirmation] = useState(false)
  const currentMembership = overview.members.find(
    (member) => member.user_id === currentUserId,
  )
  const successorCandidates = overview.members.filter(
    (member) => member.user_id !== currentUserId,
  )
  const settingsForm = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: {
      name: overview.group.name,
      description: overview.group.description ?? '',
      timezone: overview.group.timezone,
    },
  })
  return (
    <Page title={overview.group.name}>
      <p>{overview.group.description || 'Sem descrição'}</p>
      <div className="flex gap-2">
        <Badge>{overview.members.length} membros</Badge>
        <Badge>{overview.challenges.length} desafios</Badge>
      </div>
      <Tabs.Root
        key={overview.group.id}
        defaultValue="feed"
        className="grid min-w-0 gap-4"
      >
        <Tabs.List
          aria-label="Seções do grupo"
          className="border-subtle grid grid-cols-5 gap-1 rounded-xl border p-1"
        >
          {(
            [
              ['feed', 'Feed'],
              ['ranking', 'Ranking'],
              ['members', 'Membros'],
              ['challenges', 'Desafios'],
              ['settings', 'Ajustes'],
            ] as const
          ).map(([value, label]) => (
            <Tabs.Trigger
              key={value}
              value={value}
              className="text-secondary data-[state=active]:bg-accent-soft data-[state=active]:text-accent min-h-11 rounded-lg px-1 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        <Tabs.Content value="settings" className="grid min-w-0 gap-5">
          {groupActionError && (
            <p role="alert" className="text-sm font-bold text-red-700">
              {groupActionError}
            </p>
          )}
          {groupActionSuccess && (
            <p role="status" className="text-sm font-bold text-emerald-700">
              {groupActionSuccess}
            </p>
          )}
          {canManageMembers && onUpdateGroup && (
            <Surface as="section" className="grid gap-4 p-4">
              <h2 className="text-xl font-black">Dados do grupo</h2>
              <form
                className="grid gap-4"
                noValidate
                onSubmit={(event) => {
                  void settingsForm.handleSubmit((values) =>
                    onUpdateGroup(values),
                  )(event)
                }}
              >
                <Input
                  label="Nome do grupo"
                  {...fieldError(settingsForm.formState.errors.name?.message)}
                  {...settingsForm.register('name')}
                />
                <Textarea
                  label="Descrição do grupo"
                  hint="Explique o propósito e as regras principais do grupo."
                  {...fieldError(
                    settingsForm.formState.errors.description?.message,
                  )}
                  {...settingsForm.register('description')}
                />
                <Input
                  label="Fuso horário"
                  hint="Ex.: America/Fortaleza"
                  {...fieldError(
                    settingsForm.formState.errors.timezone?.message,
                  )}
                  {...settingsForm.register('timezone')}
                />
                <Button type="submit" loading={groupActionPending}>
                  Salvar grupo
                </Button>
              </form>
            </Surface>
          )}
          {onLeaveGroup && currentMembership && (
            <Surface as="section" className="grid gap-3 p-4">
              <h2 className="text-xl font-black">Sair do grupo</h2>
              {currentMembership.role === 'owner' ? (
                successorCandidates.length ? (
                  <>
                    <p className="text-secondary text-sm">
                      Para sair, transfira a propriedade. Seu histórico
                      permanece, mas você deixa de acessar o grupo e de
                      participar dos próximos cálculos.
                    </p>
                    <label className="grid gap-1 text-sm font-bold">
                      Novo proprietário
                      <select
                        className="ds-input"
                        form="leave-group-form"
                        name="successorId"
                        required
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Selecione uma pessoa
                        </option>
                        {successorCandidates.map((member) => (
                          <option key={member.user_id} value={member.user_id}>
                            {member.displayName}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <p role="status" className="text-sm">
                    Você é a única pessoa do grupo. Convide alguém para
                    transferir a propriedade antes de sair.
                  </p>
                )
              ) : (
                <p className="text-secondary text-sm">
                  Seu histórico permanece, mas você perde o acesso ao grupo e
                  deixa de participar das próximas votações.
                </p>
              )}
              {(currentMembership.role !== 'owner' ||
                successorCandidates.length > 0) &&
                (leaveConfirmation ? (
                  <form
                    id="leave-group-form"
                    className="grid gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      const successorValue = new FormData(
                        event.currentTarget,
                      ).get('successorId')
                      const successorId =
                        typeof successorValue === 'string' ? successorValue : ''
                      onLeaveGroup(successorId || undefined)
                    }}
                  >
                    <p className="font-bold">Tem certeza que deseja sair?</p>
                    <Button
                      type="submit"
                      variant="danger"
                      loading={groupActionPending}
                    >
                      Confirmar saída
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={groupActionPending}
                      onClick={() => setLeaveConfirmation(false)}
                    >
                      Permanecer no grupo
                    </Button>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="danger"
                    onClick={() => setLeaveConfirmation(true)}
                  >
                    Sair do grupo
                  </Button>
                ))}
            </Surface>
          )}
        </Tabs.Content>
        <Tabs.Content value="ranking" className="min-w-0">
          <GroupLeaderboard
            entries={overview.leaderboard}
            currentUserId={currentUserId}
          />
        </Tabs.Content>
        <Tabs.Content value="members" className="grid min-w-0 gap-4">
          {onInvite && (
            <Button type="button" onClick={onInvite}>
              Convidar pessoa
            </Button>
          )}
          <Surface
            as="section"
            className="grid gap-3 p-4"
            aria-labelledby="members-title"
          >
            <h2 id="members-title" className="text-xl font-black">
              Membros
            </h2>
            <ul className="grid gap-3">
              {overview.members.map((member) => (
                <li
                  key={member.user_id}
                  className="flex flex-wrap items-center gap-3"
                >
                  <Avatar
                    {...(member.avatarUrl ? { src: member.avatarUrl } : {})}
                    fallback={member.displayName.slice(0, 2).toUpperCase()}
                    aria-label={member.displayName}
                  />
                  <span className="min-w-0 flex-1 truncate font-bold">
                    {member.displayName}
                  </span>
                  <Badge>
                    {member.role === 'owner'
                      ? 'Proprietário'
                      : member.role === 'admin'
                        ? 'Administrador'
                        : 'Membro'}
                  </Badge>
                  {canManageMembers &&
                    member.role !== 'owner' &&
                    member.user_id !== currentUserId && (
                      <div className="ml-auto flex w-full items-center justify-end gap-2 sm:w-auto">
                        <label
                          className="sr-only"
                          htmlFor={`role-${member.user_id}`}
                        >
                          Papel de {member.displayName}
                        </label>
                        <select
                          id={`role-${member.user_id}`}
                          className="ds-input min-h-9 w-auto py-1 text-sm"
                          value={member.role}
                          onChange={(event) =>
                            onChangeRole?.(
                              member.user_id,
                              event.target.value as 'member' | 'admin',
                            )
                          }
                        >
                          <option value="member">Membro</option>
                          <option value="admin">Administrador</option>
                        </select>
                        {onRemoveMember && (
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            onClick={() => onRemoveMember(member.user_id)}
                          >
                            Remover
                          </Button>
                        )}
                      </div>
                    )}
                </li>
              ))}
            </ul>
          </Surface>
        </Tabs.Content>
        <Tabs.Content value="challenges" className="grid min-w-0 gap-4">
          {onCreateChallenge && (
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={onCreateChallenge}>
                Criar desafio
              </Button>
            </div>
          )}
          <h2 className="text-xl font-black">Desafios</h2>
          {overview.challenges.length ? (
            overview.challenges.map((item) => (
              <Surface key={item.id} className="grid gap-3 p-4">
                <strong>{item.name}</strong>
                {onOpenChallenge && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => onOpenChallenge(item.id)}
                  >
                    Abrir desafio
                  </Button>
                )}
              </Surface>
            ))
          ) : (
            <EmptyState
              title="Nenhum desafio"
              description="Crie o primeiro desafio deste grupo."
            />
          )}
        </Tabs.Content>
        <Tabs.Content value="feed" className="grid min-w-0 gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xl font-black">Feed do grupo</h2>
            {onCreateActivity && (
              <Button type="button" onClick={onCreateActivity}>
                Publicar atividade
              </Button>
            )}
          </div>
          {(overview.challengeInvites ?? []).map((challenge) => (
            <Surface
              as="article"
              variant="raised"
              key={`challenge-${challenge.challenge_id}`}
              className="grid gap-3 border-[var(--ds-color-accent)] p-4"
            >
              <div>
                <Badge tone="success">Convite para desafio</Badge>
                <h3 className="mt-2 text-lg font-black">{challenge.name}</h3>
                {challenge.description && (
                  <p className="text-secondary mt-1 text-sm">
                    {challenge.description}
                  </p>
                )}
              </div>
              <p className="text-secondary text-xs font-bold">
                {challenge.participant_count} participantes · prazo{' '}
                {new Intl.DateTimeFormat('pt-BR').format(
                  new Date(challenge.ends_at),
                )}
              </p>
              {onJoinChallenge && (
                <Button
                  type="button"
                  onClick={() => onJoinChallenge(challenge.challenge_id)}
                >
                  Entrar no desafio
                </Button>
              )}
            </Surface>
          ))}
          {postActionError && (
            <p role="alert" className="text-sm font-bold text-red-700">
              {postActionError}
            </p>
          )}
          {postActionSuccess && (
            <p role="status" className="text-sm font-bold">
              {postActionSuccess}
            </p>
          )}
          {!overview.feed.length ? (
            <EmptyState
              title="Nenhuma atividade publicada"
              description="Os posts dos membros aparecerão aqui."
            />
          ) : (
            <div className="grid gap-4">
              {overview.feed.map((post) => (
                <Surface
                  as="article"
                  variant="raised"
                  key={post.id}
                  className="overflow-hidden"
                >
                  {post.photoUrl ? (
                    <img
                      src={post.photoUrl}
                      alt={`Atividade ${post.name} publicada por ${post.authorName}`}
                      className="max-h-[32rem] w-full object-cover"
                    />
                  ) : (
                    <p role="status" className="p-4 text-sm">
                      Foto temporariamente indisponível. Atualize a página para
                      tentar novamente.
                    </p>
                  )}
                  <div className="grid gap-3 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-black">{post.authorName}</p>
                        <p className="text-secondary text-sm">{post.name}</p>
                      </div>
                      <Badge
                        tone={
                          post.status === 'approved'
                            ? 'success'
                            : post.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                        }
                      >
                        {post.status === 'approved'
                          ? `+${post.currentPoints} pontos`
                          : post.status === 'rejected'
                            ? 'Rejeitada pelo grupo'
                            : `Proposta: ${post.currentPoints} pts`}
                      </Badge>
                    </div>
                    {post.proposals.length > 0 && (
                      <ul className="grid gap-1 text-sm">
                        {post.proposals.map((proposal) => (
                          <li key={proposal.userId}>
                            <strong>{proposal.displayName}</strong>
                            {proposal.isAuthor ? ' (autor)' : ''}:{' '}
                            {proposal.points} pontos
                          </li>
                        ))}
                      </ul>
                    )}
                    <p className="text-sm">
                      {post.matchingProposals} de {post.requiredVotes} membros
                      concordam com {post.currentPoints} pontos.
                    </p>
                    <p className="text-sm">
                      {post.rejections} de {post.requiredVotes} votos para
                      rejeitar neste grupo.
                    </p>
                    {post.history.length > 0 && (
                      <details className="border-subtle rounded-xl border p-3">
                        <summary className="cursor-pointer font-bold">
                          Histórico da decisão ({post.history.length})
                        </summary>
                        <ol className="mt-3 grid gap-3 border-l border-[var(--ds-color-border)] pl-4 text-sm">
                          {post.history.map((event) => (
                            <li key={event.id}>
                              <p className="font-bold">
                                {event.type === 'points_proposed'
                                  ? `${event.actorName} propôs ${event.points} pontos.`
                                  : event.type === 'rejection_recorded'
                                    ? `${event.actorName} votou por rejeitar.`
                                    : event.type === 'rejection_withdrawn'
                                      ? `${event.actorName} retirou a rejeição ao fazer uma proposta.`
                                      : event.type === 'activity_approved'
                                        ? 'A maioria aprovou a pontuação.'
                                        : 'A maioria rejeitou a atividade.'}
                              </p>
                              <time
                                className="text-secondary text-xs"
                                dateTime={event.occurredAt}
                              >
                                {groupEventDateTime.format(
                                  new Date(event.occurredAt),
                                )}
                              </time>
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                    {post.status === 'pending' &&
                      post.hasVoted &&
                      post.authorId !== currentUserId && (
                        <p className="text-sm font-bold">
                          Você votou por rejeitar. Uma nova proposta substitui
                          seu voto enquanto a atividade estiver pendente.
                        </p>
                      )}
                    {post.status === 'pending' && onProposePostPoints && (
                      <form
                        className="grid grid-cols-[1fr_auto] gap-2"
                        onSubmit={(event) => {
                          event.preventDefault()
                          const value = Number(
                            new FormData(event.currentTarget).get('points'),
                          )
                          if (
                            !postActionPending &&
                            Number.isInteger(value) &&
                            value > 0 &&
                            value <= 100000
                          )
                            onProposePostPoints(post.id, value)
                        }}
                      >
                        <input
                          className="ds-input"
                          name="points"
                          aria-label={
                            post.authorId === currentUserId
                              ? 'Fazer contraproposta'
                              : 'Sugerir pontos'
                          }
                          type="number"
                          min={1}
                          max={100000}
                          disabled={postActionPending}
                          defaultValue={post.currentPoints}
                        />
                        <Button type="submit" disabled={postActionPending}>
                          {post.authorId === currentUserId
                            ? 'Contrapropor'
                            : 'Propor'}
                        </Button>
                      </form>
                    )}
                    {post.status === 'pending' &&
                      post.authorId !== currentUserId &&
                      !post.hasVoted &&
                      onVotePost &&
                      (rejectCandidate === post.id ? (
                        <div className="grid gap-2">
                          <p>
                            Registrar voto de rejeição? Sua proposta de pontos
                            deixa de contar. A rejeição exige maioria dos outros
                            membros e vale só neste grupo.
                          </p>
                          <Button
                            type="button"
                            variant="danger"
                            disabled={postActionPending}
                            onClick={() => {
                              onVotePost(post.id, 'rejected')
                              setRejectCandidate(undefined)
                            }}
                          >
                            Confirmar rejeição
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={postActionPending}
                            onClick={() => setRejectCandidate(undefined)}
                          >
                            Voltar
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="danger"
                          disabled={postActionPending}
                          onClick={() => setRejectCandidate(post.id)}
                        >
                          Rejeitar atividade
                        </Button>
                      ))}
                    {post.authorId === currentUserId &&
                      onDeletePost &&
                      (deleteCandidate === post.id ? (
                        <div className="border-subtle grid gap-2 border-t pt-3">
                          <p>
                            Excluir esta atividade de todos os grupos e do
                            calendário? Os pontos que ela gerou serão removidos
                            dos rankings. Esta ação não pode ser desfeita.
                          </p>
                          <Button
                            type="button"
                            variant="danger"
                            disabled={postActionPending}
                            onClick={() => {
                              onDeletePost(post.id)
                              setDeleteCandidate(undefined)
                            }}
                          >
                            Confirmar exclusão
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={postActionPending}
                            onClick={() => setDeleteCandidate(undefined)}
                          >
                            Manter atividade
                          </Button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          disabled={postActionPending}
                          onClick={() => setDeleteCandidate(post.id)}
                        >
                          Excluir atividade
                        </Button>
                      ))}
                  </div>
                </Surface>
              ))}
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </Page>
  )
}
