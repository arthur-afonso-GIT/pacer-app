import { describe, expect, it } from 'vitest'
import { deriveStatistics } from './statistics'

describe('deriveStatistics', () => {
  it('derives totals from signed ledger rows', () => {
    expect(
      deriveStatistics([
        { points: 12, createdAt: '2026-08-01T12:00:00Z' },
        { points: -12, createdAt: '2026-08-02T12:00:00Z' },
        { points: 8, createdAt: '2026-08-03T12:00:00Z' },
      ]),
    ).toEqual({
      netPoints: 8,
      awardedPoints: 20,
      reversedPoints: -12,
      transactionCount: 3,
    })
  })

  it('returns zeroed statistics for an empty ledger', () => {
    expect(deriveStatistics([])).toEqual({
      netPoints: 0,
      awardedPoints: 0,
      reversedPoints: 0,
      transactionCount: 0,
    })
  })
})
