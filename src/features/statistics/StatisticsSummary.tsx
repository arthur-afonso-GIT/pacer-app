import { Surface } from '@/design-system'
import type { LedgerStatistics } from './statistics'

export function StatisticsSummary({
  statistics,
}: {
  statistics: LedgerStatistics
}) {
  const cards = [
    ['Saldo', statistics.netPoints],
    ['Ganhos', statistics.awardedPoints],
    ['Pontos revertidos', Math.abs(statistics.reversedPoints)],
    ['Lançamentos', statistics.transactionCount],
  ] as const
  return (
    <section aria-labelledby="statistics-title">
      <h2 id="statistics-title" className="text-xl font-black">
        Estatísticas
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {cards.map(([label, value]) => (
          <Surface key={label} className="rounded-2xl p-4">
            <p className="text-secondary text-xs font-bold">{label}</p>
            <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
          </Surface>
        ))}
      </div>
    </section>
  )
}
