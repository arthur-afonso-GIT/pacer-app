import * as Tabs from '@radix-ui/react-tabs'
import { CalendarDays, Plus, UsersRound } from 'lucide-react'
import { useState } from 'react'
import { Badge, Button, EmptyState, Surface } from '@/design-system'
import type { ChallengeHubItem } from './api'

const formatDeadline = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))

function ChallengeCard({
  challenge,
  onOpen,
  onJoin,
  joining,
  secondaryLabel,
  onSecondary,
}: {
  challenge: ChallengeHubItem
  onOpen: () => void
  onJoin?: () => void
  joining?: boolean
  secondaryLabel?: string
  onSecondary?: () => void
}) {
  return (
    <Surface as="article" className="grid gap-3 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-accent truncate text-xs font-extrabold uppercase">
            {challenge.group_name}
          </p>
          <h3 className="mt-1 text-lg font-black">{challenge.name}</h3>
        </div>
        {challenge.is_participant ? (
          <Badge tone="success">Participando</Badge>
        ) : (
          <Badge>Convite</Badge>
        )}
      </div>
      {challenge.description && (
        <p className="text-secondary text-sm">{challenge.description}</p>
      )}
      <div className="text-secondary flex flex-wrap gap-4 text-xs font-bold">
        <span className="flex items-center gap-1">
          <CalendarDays aria-hidden size={15} /> até{' '}
          {formatDeadline(challenge.ends_at)}
        </span>
        {challenge.series_group_count > 1 && (
          <span>Publicado em {challenge.series_group_count} grupos</span>
        )}
        <span className="flex items-center gap-1">
          <UsersRound aria-hidden size={15} /> {challenge.participant_count}{' '}
          participantes
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {onJoin ? (
          <Button
            type="button"
            {...(joining ? { loading: true } : {})}
            onClick={onJoin}
          >
            Entrar no desafio
          </Button>
        ) : (
          <Button type="button" onClick={onOpen}>
            Abrir desafio
          </Button>
        )}
        {onJoin && (
          <Button type="button" variant="secondary" onClick={onOpen}>
            Ver detalhes
          </Button>
        )}
      </div>
      {secondaryLabel && onSecondary && (
        <Button type="button" variant="ghost" onClick={onSecondary}>
          {secondaryLabel}
        </Button>
      )}
    </Surface>
  )
}

export function ChallengeHubPage({
  challenges,
  loading = false,
  error,
  joiningId,
  actionPending = false,
  actionError,
  onCreate,
  onOpen,
  onJoin,
  onDismiss,
  onLeave,
  onCancelSeries,
}: {
  challenges: readonly ChallengeHubItem[]
  loading?: boolean
  error?: string
  joiningId?: string
  actionPending?: boolean
  actionError?: string
  onCreate: () => void
  onOpen: (challengeId: string) => void
  onJoin: (challengeId: string) => void
  onDismiss: (challengeId: string) => void
  onLeave: (challengeId: string) => void
  onCancelSeries: (seriesId: string) => void
}) {
  const [confirmation, setConfirmation] = useState<{
    action: 'dismiss' | 'leave' | 'cancel'
    id: string
    name: string
  }>()
  const [referenceTime] = useState(() => Date.now())
  const isClosed = (item: ChallengeHubItem) =>
    item.status === 'cancelled' ||
    item.status === 'completed' ||
    new Date(item.ends_at).getTime() <= referenceTime
  const closed = challenges.filter(isClosed)
  const participating = challenges.filter(
    (item) => item.is_participant && !isClosed(item),
  )
  const invitations = challenges.filter(
    (item) =>
      !item.is_participant &&
      item.participation_mode === 'opt_in' &&
      !isClosed(item),
  )
  const created = challenges.filter(
    (item) => item.is_creator && !isClosed(item),
  )
  const sections = [
    ['mine', 'Meus', participating],
    ['invites', 'Convites', invitations],
    ['created', 'Criados', created],
    ['closed', 'Histórico', closed],
  ] as const

  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
      <div>
        <div>
          <p className="text-accent text-xs font-extrabold uppercase">
            Em grupo
          </p>
          <h1 className="mt-1 text-3xl font-black">Desafios</h1>
        </div>
      </div>
      <div className="grid justify-items-center gap-2 py-2">
        <Button
          type="button"
          onClick={onCreate}
          aria-label="Criar desafio"
          className="size-16 rounded-full p-0 shadow-lg"
        >
          <Plus aria-hidden size={32} strokeWidth={2.6} />
        </Button>
        <span className="text-sm font-black">Criar desafio</span>
      </div>
      {(error || actionError) && <p role="alert">{error || actionError}</p>}
      {loading ? (
        <p role="status">Carregando desafios…</p>
      ) : (
        <Tabs.Root defaultValue="mine" className="grid gap-4">
          <Tabs.List
            aria-label="Tipos de desafio"
            className="border-subtle grid grid-cols-4 gap-1 rounded-xl border p-1"
          >
            {sections.map(([value, label, items]) => (
              <Tabs.Trigger
                key={value}
                value={value}
                className="text-secondary data-[state=active]:bg-accent-soft data-[state=active]:text-accent min-h-11 rounded-lg text-sm font-bold"
              >
                {label} ({items.length})
              </Tabs.Trigger>
            ))}
          </Tabs.List>
          {sections.map(([value, label, items]) => (
            <Tabs.Content key={value} value={value} className="grid gap-3">
              {items.length ? (
                items.map((challenge) => {
                  const secondary =
                    value === 'invites'
                      ? { action: 'dismiss' as const, label: 'Agora não' }
                      : value === 'created' && challenge.series_id
                        ? {
                            action: 'cancel' as const,
                            label: 'Encerrar desafio',
                          }
                        : value === 'mine' && !challenge.is_creator
                          ? {
                              action: 'leave' as const,
                              label: 'Sair do desafio',
                            }
                          : undefined
                  return (
                    <ChallengeCard
                      key={challenge.challenge_id}
                      challenge={challenge}
                      onOpen={() => onOpen(challenge.challenge_id)}
                      {...(!challenge.is_participant
                        ? {
                            onJoin: () => onJoin(challenge.challenge_id),
                            joining: joiningId === challenge.challenge_id,
                          }
                        : {})}
                      {...(secondary
                        ? {
                            secondaryLabel: secondary.label,
                            onSecondary: () =>
                              setConfirmation({
                                action: secondary.action,
                                id:
                                  secondary.action === 'cancel'
                                    ? (challenge.series_id ?? '')
                                    : challenge.challenge_id,
                                name: challenge.name,
                              }),
                          }
                        : {})}
                    />
                  )
                })
              ) : (
                <EmptyState
                  title={`Nenhum item em ${label.toLowerCase()}`}
                  description={
                    value === 'invites'
                      ? 'Os convites publicados nos seus grupos aparecerão aqui.'
                      : 'Crie ou entre em um desafio para começar.'
                  }
                />
              )}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      )}
      {confirmation && (
        <Surface className="grid gap-3 border-red-300 p-4" aria-live="polite">
          <p className="font-black">
            {confirmation.action === 'cancel'
              ? `Encerrar “${confirmation.name}” em todos os grupos?`
              : confirmation.action === 'leave'
                ? `Sair de “${confirmation.name}”?`
                : `Ocultar o convite “${confirmation.name}”?`}
          </p>
          <p className="text-secondary text-sm">
            O histórico e os pontos já confirmados serão preservados.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="danger"
              loading={actionPending}
              onClick={() => {
                if (confirmation.action === 'cancel')
                  onCancelSeries(confirmation.id)
                else if (confirmation.action === 'leave')
                  onLeave(confirmation.id)
                else onDismiss(confirmation.id)
                setConfirmation(undefined)
              }}
            >
              Confirmar
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setConfirmation(undefined)}
            >
              Voltar
            </Button>
          </div>
        </Surface>
      )}
    </section>
  )
}
