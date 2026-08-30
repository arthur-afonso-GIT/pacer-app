import { useState } from 'react'
import { Avatar, Button, EmptyState, Skeleton, Surface } from '@/design-system'
import {
  ActivityConsistencySummary,
  StatisticsSummary,
  type ActivityConsistency,
  type LedgerStatistics,
  useActivityConsistency,
  useStatistics,
} from '@/features/statistics'
import { useRanking } from './queries'
import type { RankingEntry, RankingPeriod } from './ranking'

const periods: ReadonlyArray<{ value: RankingPeriod; label: string }> = [
  { value: 'day', label: 'Hoje' },
  { value: 'week', label: 'Semana' },
  { value: 'month', label: 'Mês' },
  { value: 'challenge', label: 'Desafio' },
]

export function PeriodSwitcher({
  value,
  onChange,
}: {
  value: RankingPeriod
  onChange: (period: RankingPeriod) => void
}) {
  return (
    <div
      className="bg-surface-subtle grid grid-cols-4 gap-1 rounded-full p-1"
      aria-label="Período do ranking"
    >
      {periods.map((period) => (
        <button
          type="button"
          key={period.value}
          aria-pressed={value === period.value}
          onClick={() => onChange(period.value)}
          className={`min-h-10 rounded-full px-2 text-xs font-extrabold transition-colors ${
            value === period.value
              ? 'bg-surface text-accent shadow-sm'
              : 'text-secondary hover:text-primary'
          }`}
        >
          {period.label}
        </button>
      ))}
    </div>
  )
}

interface RankingViewProps {
  period: RankingPeriod
  onPeriodChange: (period: RankingPeriod) => void
  entries?: readonly RankingEntry[]
  statistics?: LedgerStatistics
  consistency?: ActivityConsistency
  statisticsLoading?: boolean
  statisticsError?: string
  loading?: boolean
  error?: string
  onOpenLedger?: () => void
}

export function RankingView({
  period,
  onPeriodChange,
  entries = [],
  statistics,
  consistency,
  statisticsLoading = false,
  statisticsError,
  loading = false,
  error,
  onOpenLedger,
}: RankingViewProps) {
  return (
    <section className="mx-auto max-w-xl py-6">
      <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
        Pontos confirmados
      </p>
      <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">Ranking</h1>
      <p className="text-secondary mt-2 mb-6 text-sm">
        Resultado calculado diretamente do histórico de pontos.
      </p>
      <PeriodSwitcher value={period} onChange={onPeriodChange} />
      {onOpenLedger && (
        <Button
          type="button"
          variant="secondary"
          fullWidth
          className="mt-3"
          onClick={onOpenLedger}
        >
          Administrar lançamentos
        </Button>
      )}

      <div className="mt-6" aria-live="polite">
        {statisticsLoading ? (
          <div aria-label="Carregando suas estatísticas">
            <Skeleton height={128} className="w-full rounded-2xl" />
          </div>
        ) : statisticsError ? (
          <Surface className="p-4">
            <p role="alert" className="text-sm text-red-700">
              Não foi possível carregar suas estatísticas neste período.
            </p>
          </Surface>
        ) : statistics ? (
          <StatisticsSummary statistics={statistics} />
        ) : null}
      </div>

      {consistency && (
        <div className="mt-4">
          <ActivityConsistencySummary consistency={consistency} />
        </div>
      )}

      <div className="mt-5" aria-live="polite">
        {loading ? (
          <div className="grid gap-3" aria-label="Carregando ranking">
            {[0, 1, 2].map((item) => (
              <Skeleton key={item} height={72} className="w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <EmptyState title="Não foi possível carregar" description={error} />
        ) : entries.length === 0 ? (
          <EmptyState
            title="Ainda não há participantes"
            description="O ranking aparecerá quando o desafio tiver membros."
          />
        ) : (
          <ol className="grid gap-3">
            {entries.map((entry) => (
              <li key={entry.userId}>
                <Surface className="flex min-h-18 items-center gap-3 rounded-2xl px-4 py-3">
                  <span className="text-secondary w-8 text-center text-sm font-black">
                    {entry.rank}º
                  </span>
                  <Avatar
                    {...(entry.avatarUrl ? { src: entry.avatarUrl } : {})}
                    fallback={entry.displayName.slice(0, 2).toUpperCase()}
                    aria-label={entry.displayName}
                  />
                  <span className="min-w-0 flex-1 truncate font-extrabold">
                    {entry.displayName}
                  </span>
                  <span className="text-accent font-black tabular-nums">
                    {entry.points} pts
                  </span>
                </Surface>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}

export function RankingPage({
  challengeId,
  timezone,
  userId,
  onOpenLedger,
}: {
  challengeId: string
  timezone: string
  userId: string
  onOpenLedger?: () => void
}) {
  const [period, setPeriod] = useState<RankingPeriod>('week')
  const ranking = useRanking({ challengeId, timezone, period })
  const statistics = useStatistics({ challengeId, userId, timezone, period })
  const consistency = useActivityConsistency({ challengeId, userId, timezone })
  return (
    <RankingView
      period={period}
      onPeriodChange={setPeriod}
      {...(onOpenLedger ? { onOpenLedger } : {})}
      entries={ranking.data ?? []}
      {...(statistics.data ? { statistics: statistics.data } : {})}
      {...(consistency.data ? { consistency: consistency.data } : {})}
      statisticsLoading={statistics.isLoading}
      {...(statistics.error instanceof Error
        ? { statisticsError: statistics.error.message }
        : {})}
      loading={ranking.isLoading}
      {...(ranking.error instanceof Error
        ? { error: ranking.error.message }
        : {})}
    />
  )
}
