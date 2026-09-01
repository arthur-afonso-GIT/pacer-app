import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Clock3,
  Plus,
  Trophy,
} from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, EmptyState, Skeleton, Surface } from '@/design-system'
import { useAuth } from '@/features/auth'
import { supabase } from '@/infrastructure/supabase/client'
import { copy } from '@/shared/i18n/pt-BR'
import {
  createTodayRepository,
  type TodayChallenge,
  type TodayDashboard,
  type TodaySubmission,
} from './api'
import { useMarkNotificationRead, useTodayDashboard } from './queries'

const statusCopy = {
  pending: 'Aguardando revisão',
  approved: 'Aprovada',
  rejected: 'Recusada',
  cancelled: 'Cancelada',
  disputed: 'Em análise',
} as const

function ChallengeCard({
  challenge,
  onSubmit,
  onOpen,
}: {
  challenge: TodayChallenge
  onSubmit: () => void
  onOpen: () => void
}) {
  return (
    <Surface as="article" variant="raised" className="grid gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-secondary truncate text-xs font-bold uppercase">
            {challenge.groupName}
          </p>
          <h2 className="mt-1 text-xl font-black">{challenge.name}</h2>
        </div>
        <Badge tone="success">Em andamento</Badge>
      </div>
      {challenge.habits.length > 0 && (
        <ul className="grid gap-2">
          {challenge.habits.slice(0, 3).map((habit) => (
            <li
              key={habit.id}
              className="bg-canvas flex items-center justify-between rounded-xl px-3 py-2 text-sm"
            >
              <span className="font-bold">{habit.name}</span>
              <span className="text-accent font-black">
                +{habit.points} pts
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button type="button" onClick={onSubmit}>
          <Plus aria-hidden size={18} /> Registrar
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onOpen}
          aria-label={`Abrir ${challenge.name}`}
        >
          <ArrowRight aria-hidden size={18} />
        </Button>
      </div>
    </Surface>
  )
}

function RecentSubmission({ submission }: { submission: TodaySubmission }) {
  const approved = submission.status === 'approved'
  return (
    <li className="flex items-center gap-3 py-3">
      <span
        className={`grid size-9 place-items-center rounded-full ${approved ? 'bg-accent-soft text-positive' : 'bg-canvas text-secondary'}`}
      >
        {approved ? (
          <CheckCircle2 aria-hidden size={19} />
        ) : (
          <Clock3 aria-hidden size={19} />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{submission.habitName}</p>
        <p className="text-secondary text-xs">
          {statusCopy[submission.status]}
        </p>
      </div>
    </li>
  )
}

export function TodayView({
  dashboard,
  loading = false,
  error,
  onRetry,
  onOpenGroups,
  onCreateHabit,
  onOpenChallenge,
  onSubmit,
  onReadNotification,
  onOpenNotifications,
}: {
  dashboard?: TodayDashboard
  loading?: boolean
  error?: string
  onRetry?: () => void
  onOpenGroups: () => void
  onCreateHabit?: () => void
  onOpenChallenge: (challengeId: string) => void
  onSubmit: (challengeId: string) => void
  onReadNotification?: (notificationId: string) => void
  onOpenNotifications?: () => void
}) {
  return (
    <section className="mx-auto grid w-full max-w-xl gap-7 py-6">
      <header>
        <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
          {copy.today.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl leading-tight font-black tracking-[-0.04em]">
          {copy.today.greeting}
        </h1>
        <p className="text-secondary mt-3">{copy.today.description}</p>
        {onCreateHabit && (
          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={onCreateHabit}
          >
            <Plus aria-hidden size={18} /> Publicar atividade
          </Button>
        )}
      </header>

      {loading ? (
        <div className="grid gap-4" aria-label="Carregando seu dia">
          <Skeleton height={210} className="w-full rounded-2xl" />
          <Skeleton height={120} className="w-full rounded-2xl" />
        </div>
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar seu dia"
          description={error}
          action={
            onRetry ? (
              <Button onClick={onRetry}>Tentar novamente</Button>
            ) : undefined
          }
        />
      ) : !dashboard?.challenges.length ? (
        <EmptyState
          icon={<Trophy aria-hidden size={34} />}
          title="Nenhum desafio ativo"
          description="Entre em um grupo e participe de um desafio para começar a registrar atividades."
          action={<Button onClick={onOpenGroups}>Ver meus grupos</Button>}
        />
      ) : (
        <div className="grid gap-4">
          <h2 className="text-xl font-black">Desafios de hoje</h2>
          {dashboard.challenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              onSubmit={() => onSubmit(challenge.id)}
              onOpen={() => onOpenChallenge(challenge.id)}
            />
          ))}
        </div>
      )}

      {dashboard && dashboard.recentSubmissions.length > 0 && (
        <Surface as="section" className="p-5" aria-labelledby="recent-title">
          <h2 id="recent-title" className="text-lg font-black">
            Atividades recentes
          </h2>
          <ul className="mt-2 divide-y divide-[var(--ds-color-border)]">
            {dashboard.recentSubmissions.map((submission) => (
              <RecentSubmission key={submission.id} submission={submission} />
            ))}
          </ul>
          {onOpenNotifications && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={onOpenNotifications}
            >
              Ver todas as notificações <ArrowRight aria-hidden size={17} />
            </Button>
          )}
        </Surface>
      )}

      {dashboard && dashboard.notifications.length > 0 && (
        <Surface
          as="section"
          className="p-5"
          aria-labelledby="notifications-title"
        >
          <h2
            id="notifications-title"
            className="flex items-center gap-2 text-lg font-black"
          >
            <Bell aria-hidden size={19} /> Notificações
          </h2>
          <ul className="mt-2 divide-y divide-[var(--ds-color-border)]">
            {dashboard.notifications.map((notification) => (
              <li key={notification.id} className="flex items-start gap-3 py-3">
                <span
                  className={`mt-2 size-2 rounded-full ${notification.read ? 'bg-subtle' : 'bg-accent'}`}
                  aria-label={notification.read ? 'Lida' : 'Não lida'}
                />
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{notification.title}</p>
                  {notification.body && (
                    <p className="text-secondary text-sm">
                      {notification.body}
                    </p>
                  )}
                </div>
                {!notification.read && onReadNotification && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onReadNotification(notification.id)}
                  >
                    Marcar como lida
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Surface>
      )}
    </section>
  )
}

export function TodayRoute() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repository = useMemo(() => {
    if (!supabase) throw new Error('Supabase não está configurado.')
    return createTodayRepository(supabase)
  }, [])
  const dashboard = useTodayDashboard(repository, user?.id ?? '')
  const markRead = useMarkNotificationRead(repository, user?.id ?? '')

  return (
    <TodayView
      {...(dashboard.data ? { dashboard: dashboard.data } : {})}
      loading={dashboard.isLoading}
      {...(dashboard.error instanceof Error
        ? { error: dashboard.error.message }
        : {})}
      onRetry={() => void dashboard.refetch()}
      onOpenGroups={() => void navigate('/grupo')}
      onCreateHabit={() => void navigate('/habitos/criar')}
      onOpenChallenge={(id) => void navigate(`/desafio/${id}`)}
      onSubmit={(id) => void navigate(`/desafio/${id}/registrar`)}
      onReadNotification={(id) => markRead.mutate(id)}
      onOpenNotifications={() => void navigate('/notificacoes')}
    />
  )
}
