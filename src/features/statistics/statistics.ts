export interface StatisticsLedgerRow {
  points: number
  createdAt: string
}

export interface LedgerStatistics {
  netPoints: number
  awardedPoints: number
  reversedPoints: number
  transactionCount: number
}

export function deriveStatistics(
  rows: readonly StatisticsLedgerRow[],
): LedgerStatistics {
  return rows.reduce<LedgerStatistics>(
    (statistics, row) => ({
      netPoints: statistics.netPoints + row.points,
      awardedPoints:
        statistics.awardedPoints + (row.points > 0 ? row.points : 0),
      reversedPoints:
        statistics.reversedPoints + (row.points < 0 ? row.points : 0),
      transactionCount: statistics.transactionCount + 1,
    }),
    { netPoints: 0, awardedPoints: 0, reversedPoints: 0, transactionCount: 0 },
  )
}
