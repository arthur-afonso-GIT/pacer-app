import { Badge, Button, Surface } from '@/design-system'

export type ChallengeDestination = 'submit' | 'reviews' | 'ranking' | 'habit'

interface ChallengeHomePageProps {
  name: string
  description?: string | null
  habitCount: number
  habits?: ReadonlyArray<{
    id: string
    name: string
    points: number
    maxSubmissionsPerDay: number
  }>
  startsAt?: string
  endsAt?: string
  timezone?: string
  reviewPolicy?: 'any_other_member' | 'admins_only' | 'selected_reviewers'
  status?: 'draft' | 'scheduled' | 'active' | 'completed' | 'cancelled'
  canManage?: boolean
  publishing?: boolean
  publishError?: string
  onPublish?: () => void
  onNavigate: (destination: ChallengeDestination) => void
}

const actions: {
  destination: ChallengeDestination
  label: string
  variant: 'primary' | 'secondary' | 'ghost'
}[] = [
  { destination: 'submit', label: 'Registrar atividade', variant: 'primary' },
  { destination: 'reviews', label: 'Revisar atividades', variant: 'secondary' },
  { destination: 'ranking', label: 'Ver ranking', variant: 'secondary' },
  { destination: 'habit', label: 'Adicionar hábito', variant: 'ghost' },
]

const statusCopy = {
  draft: 'Desafio em preparação',
  scheduled: 'Desafio agendado',
  active: 'Desafio ativo',
  completed: 'Desafio concluído',
  cancelled: 'Desafio cancelado',
} as const

const reviewPolicyCopy = {
  any_other_member: 'Revisão por outro participante',
  admins_only: 'Revisão por administradores',
  selected_reviewers: 'Revisores selecionados',
} as const

const formatDateTime = (value: string, timezone: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: timezone,
  }).format(new Date(value))

export function ChallengeHomePage({
  name,
  description,
  habitCount,
  habits = [],
  startsAt,
  endsAt,
  timezone = 'UTC',
  reviewPolicy,
  status = 'active',
  canManage = false,
  publishing = false,
  publishError,
  onPublish,
  onNavigate,
}: ChallengeHomePageProps) {
  const visibleActions = actions.filter((action) => {
    if (action.destination === 'habit') return status === 'draft' && canManage
    if (action.destination === 'ranking')
      return status === 'active' || status === 'completed'
    return status === 'active'
  })
  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
      <div>
        <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
          {statusCopy[status]}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">{name}</h1>
        {description && <p className="text-secondary mt-2">{description}</p>}
      </div>
      <Badge>
        {habitCount} {habitCount === 1 ? 'hábito' : 'hábitos'}
      </Badge>
      {(startsAt || endsAt || reviewPolicy || habits.length > 0) && (
        <Surface
          as="section"
          className="grid gap-4 p-4"
          aria-labelledby="rules-title"
        >
          <div>
            <h2 id="rules-title" className="text-lg font-black">
              Regras do desafio
            </h2>
            <p className="text-secondary mt-1 text-sm">
              Depois da publicação, período, revisão e pontuação ficam
              congelados.
            </p>
          </div>
          {(startsAt || endsAt) && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {startsAt && (
                <div>
                  <dt className="text-secondary font-bold">Início</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDateTime(startsAt, timezone)}
                  </dd>
                </div>
              )}
              {endsAt && (
                <div>
                  <dt className="text-secondary font-bold">Fim</dt>
                  <dd className="mt-1 font-semibold">
                    {formatDateTime(endsAt, timezone)}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {reviewPolicy && (
            <p className="text-sm">
              <span className="text-secondary font-bold">Validação: </span>
              <span className="font-semibold">
                {reviewPolicyCopy[reviewPolicy]}
              </span>
            </p>
          )}
          {habits.length > 0 && (
            <ul className="grid gap-2">
              {habits.map((habit) => (
                <li
                  key={habit.id}
                  className="bg-canvas flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-sm"
                >
                  <span className="font-bold">{habit.name}</span>
                  <span className="text-accent text-right font-black">
                    {habit.points} pts · {habit.maxSubmissionsPerDay}/dia
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      )}
      {status === 'draft' && canManage && onPublish && (
        <Surface variant="subtle" className="grid gap-3 p-4">
          <div>
            <h2 className="font-black">Pronto para começar?</h2>
            <p className="text-secondary mt-1 text-sm">
              Confira os hábitos antes de publicar. Depois disso, participantes
              poderão registrar atividades.
            </p>
          </div>
          <Button
            type="button"
            fullWidth
            disabled={habitCount === 0}
            loading={publishing}
            onClick={onPublish}
          >
            Publicar desafio
          </Button>
          {habitCount === 0 && (
            <p className="text-secondary text-sm">
              Adicione pelo menos um hábito para publicar.
            </p>
          )}
          {publishError && (
            <p role="alert" className="text-sm text-red-700">
              {publishError}
            </p>
          )}
        </Surface>
      )}
      {visibleActions.length > 0 && (
        <Surface variant="raised" className="grid gap-3 p-4">
          <h2 className="text-lg font-black">O que você quer fazer?</h2>
          {visibleActions.map((action) => (
            <Button
              key={action.destination}
              type="button"
              variant={action.variant}
              fullWidth
              onClick={() => onNavigate(action.destination)}
            >
              {action.label}
            </Button>
          ))}
        </Surface>
      )}
    </section>
  )
}
