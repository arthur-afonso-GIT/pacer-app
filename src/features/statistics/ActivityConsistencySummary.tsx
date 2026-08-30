import { StreakIndicator, Surface } from '@/design-system'
import type { ActivityConsistency } from './consistency'

const intensity = (count: number) =>
  count === 0
    ? 'bg-surface-subtle'
    : count === 1
      ? 'bg-accent/35'
      : count === 2
        ? 'bg-accent/65'
        : 'bg-accent'

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`))

export function ActivityConsistencySummary({
  consistency,
}: {
  consistency: ActivityConsistency
}) {
  return (
    <Surface
      as="section"
      className="grid gap-4 p-4"
      aria-labelledby="consistency-title"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="consistency-title" className="text-lg font-black">
            Sua consistência
          </h2>
          <p className="text-secondary mt-1 text-sm">
            Atividades aprovadas nos últimos 28 dias.
          </p>
        </div>
        <StreakIndicator days={consistency.currentStreak} />
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-secondary font-bold">Melhor sequência</dt>
          <dd className="mt-1 text-xl font-black">
            {consistency.bestStreak} dias
          </dd>
        </div>
        <div>
          <dt className="text-secondary font-bold">Dias ativos</dt>
          <dd className="mt-1 text-xl font-black">{consistency.activeDays}</dd>
        </div>
      </dl>
      <ol
        className="grid grid-cols-7 gap-1.5"
        aria-label="Mapa de atividades dos últimos 28 dias"
      >
        {consistency.heatmap.map((day) => (
          <li
            key={day.date}
            className={`aspect-square rounded-md ${intensity(day.count)}`}
            aria-label={`${formatDate(day.date)}: ${day.count} ${day.count === 1 ? 'atividade aprovada' : 'atividades aprovadas'}`}
            title={`${formatDate(day.date)}: ${day.count}`}
          />
        ))}
      </ol>
    </Surface>
  )
}
