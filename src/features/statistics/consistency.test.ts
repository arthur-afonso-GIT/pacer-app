import { describe, expect, it } from 'vitest'
import { deriveActivityConsistency } from './consistency'

describe('activity consistency', () => {
  it('deduplicates active days and calculates current and best streaks', () => {
    const result = deriveActivityConsistency(
      [
        '2026-08-20',
        '2026-08-21',
        '2026-08-21',
        '2026-08-25',
        '2026-08-26',
        '2026-08-27',
        '2026-08-28',
      ],
      '2026-08-29',
    )
    expect(result.currentStreak).toBe(4)
    expect(result.bestStreak).toBe(4)
    expect(result.activeDays).toBe(6)
    expect(result.heatmap).toHaveLength(28)
    expect(result.heatmap.at(-1)).toEqual({ date: '2026-08-29', count: 0 })
    expect(result.heatmap.at(-2)).toEqual({ date: '2026-08-28', count: 1 })
  })

  it('returns no current streak when neither today nor yesterday was active', () => {
    expect(
      deriveActivityConsistency(['2026-08-20'], '2026-08-29').currentStreak,
    ).toBe(0)
  })
})
