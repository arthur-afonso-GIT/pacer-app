import { CalendarDays, Flame, Sparkles } from 'lucide-react'
import { Badge, Surface } from '@/design-system'
import { getConsistencyMilestone, type WeeklyConsistency } from './weekly'

const milestoneCopy = {
  start: 'Semana iniciada',
  rhythm: 'Pegando ritmo',
  consistent: 'Consistência em alta',
} as const

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))

export function WeeklyConsistencySummary({
  summaries,
}: {
  summaries: readonly WeeklyConsistency[]
}) {
  if (summaries.length === 0) return null

  return (
    <section aria-labelledby="weekly-consistency-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
            Progresso saudável
          </p>
          <h2 id="weekly-consistency-title" className="mt-1 text-xl font-black">
            Sua semana
          </h2>
        </div>
        <CalendarDays aria-hidden className="text-secondary" size={22} />
      </div>
      <div className="mt-3 grid gap-3">
        {summaries.map((summary) => {
          const milestone = getConsistencyMilestone(summary.activeDays)
          return (
            <Surface key={summary.groupId} className="grid gap-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate font-black">{summary.groupName}</h3>
                  <p className="text-secondary mt-1 text-xs">
                    {formatDate(summary.weekStart)}–
                    {formatDate(summary.weekEnd)}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div
                    className={`flex min-h-11 items-center gap-2 rounded-2xl px-3 py-2 ${
                      summary.currentStreak > 0
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-surface-subtle text-secondary'
                    }`}
                    aria-label={`Sequência atual: ${summary.currentStreak} ${summary.currentStreak === 1 ? 'dia' : 'dias'}`}
                  >
                    <Flame
                      aria-hidden
                      size={24}
                      fill={summary.currentStreak > 0 ? 'currentColor' : 'none'}
                    />
                    <span className="text-xl font-black tabular-nums">
                      {summary.currentStreak}
                    </span>
                    <span className="text-xs font-extrabold">
                      {summary.currentStreak === 1 ? 'dia' : 'dias'}
                    </span>
                  </div>
                  {milestone && (
                    <Badge tone="success">
                      <Sparkles aria-hidden size={13} />{' '}
                      {milestoneCopy[milestone]}
                    </Badge>
                  )}
                </div>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-canvas rounded-xl p-2">
                  <dt className="text-secondary text-[0.7rem] font-bold">
                    Dias ativos
                  </dt>
                  <dd className="mt-1 text-xl font-black tabular-nums">
                    {summary.activeDays}
                  </dd>
                </div>
                <div className="bg-canvas rounded-xl p-2">
                  <dt className="text-secondary text-[0.7rem] font-bold">
                    Validadas
                  </dt>
                  <dd className="mt-1 text-xl font-black tabular-nums">
                    {summary.approvedActivities}
                  </dd>
                </div>
                <div className="bg-canvas rounded-xl p-2">
                  <dt className="text-secondary text-[0.7rem] font-bold">
                    Saldo
                  </dt>
                  <dd className="mt-1 text-xl font-black tabular-nums">
                    {summary.netPoints}
                  </dd>
                </div>
              </dl>
              {summary.activeDays === 0 && (
                <p className="text-secondary text-sm">
                  Sua próxima atividade validada inicia a semana — no seu ritmo.
                </p>
              )}
            </Surface>
          )
        })}
      </div>
    </section>
  )
}
