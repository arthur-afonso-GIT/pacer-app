import * as Tabs from '@radix-ui/react-tabs'
import { CalendarDays, Plus, UsersRound } from 'lucide-react'
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
}: {
  challenge: ChallengeHubItem
  onOpen: () => void
  onJoin?: () => void
  joining?: boolean
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
    </Surface>
  )
}

export function ChallengeHubPage({
  challenges,
  loading = false,
  error,
  joiningId,
  onCreate,
  onOpen,
  onJoin,
}: {
  challenges: readonly ChallengeHubItem[]
  loading?: boolean
  error?: string
  joiningId?: string
  onCreate: () => void
  onOpen: (challengeId: string) => void
  onJoin: (challengeId: string) => void
}) {
  const participating = challenges.filter((item) => item.is_participant)
  const invitations = challenges.filter(
    (item) => !item.is_participant && item.participation_mode === 'opt_in',
  )
  const created = challenges.filter((item) => item.is_creator)
  const sections = [
    ['mine', 'Meus', participating],
    ['invites', 'Convites', invitations],
    ['created', 'Criados', created],
  ] as const

  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-accent text-xs font-extrabold uppercase">
            Em grupo
          </p>
          <h1 className="mt-1 text-3xl font-black">Desafios</h1>
        </div>
        <Button type="button" onClick={onCreate} aria-label="Criar desafio">
          <Plus aria-hidden size={19} /> Criar
        </Button>
      </div>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">Carregando desafios…</p>
      ) : (
        <Tabs.Root defaultValue="mine" className="grid gap-4">
          <Tabs.List
            aria-label="Tipos de desafio"
            className="border-subtle grid grid-cols-3 gap-1 rounded-xl border p-1"
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
                items.map((challenge) => (
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
                  />
                ))
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
    </section>
  )
}
