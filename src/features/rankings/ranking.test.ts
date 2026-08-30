import { describe, expect, it } from 'vitest'
import { aggregateRanking, getPeriodRange } from './ranking'

describe('aggregateRanking', () => {
  const members = [
    { userId: 'ana', displayName: 'Ana', avatarUrl: null },
    { userId: 'bia', displayName: 'Bia', avatarUrl: 'bia.png' },
    { userId: 'caio', displayName: 'Caio', avatarUrl: null },
  ]

  it('sums signed ledger entries instead of reading a cached profile score', () => {
    const result = aggregateRanking(members, [
      { userId: 'ana', points: 20 },
      { userId: 'ana', points: -20 },
      { userId: 'ana', points: 5 },
      { userId: 'bia', points: 4 },
    ])

    expect(result.map(({ userId, points }) => ({ userId, points }))).toEqual([
      { userId: 'ana', points: 5 },
      { userId: 'bia', points: 4 },
      { userId: 'caio', points: 0 },
    ])
  })

  it('uses competition ranks for ties and a stable name ordering', () => {
    const result = aggregateRanking(members, [
      { userId: 'caio', points: 10 },
      { userId: 'ana', points: 10 },
      { userId: 'bia', points: 2 },
    ])

    expect(
      result.map(({ displayName, rank }) => ({ displayName, rank })),
    ).toEqual([
      { displayName: 'Ana', rank: 1 },
      { displayName: 'Caio', rank: 1 },
      { displayName: 'Bia', rank: 3 },
    ])
  })
})

describe('getPeriodRange', () => {
  const now = new Date('2026-08-29T15:00:00.000Z')

  it('creates day boundaries in the group timezone', () => {
    expect(getPeriodRange('day', 'America/Sao_Paulo', now)).toEqual({
      from: '2026-08-29T03:00:00.000Z',
      to: '2026-08-30T03:00:00.000Z',
    })
  })

  it('starts the current week on Monday in the group timezone', () => {
    expect(getPeriodRange('week', 'America/Sao_Paulo', now)).toEqual({
      from: '2026-08-24T03:00:00.000Z',
      to: '2026-08-31T03:00:00.000Z',
    })
  })

  it('uses a 23-hour day when daylight saving time starts', () => {
    expect(
      getPeriodRange(
        'day',
        'America/New_York',
        new Date('2026-03-08T16:00:00.000Z'),
      ),
    ).toEqual({
      from: '2026-03-08T05:00:00.000Z',
      to: '2026-03-09T04:00:00.000Z',
    })
  })

  it('uses a 25-hour day when daylight saving time ends', () => {
    expect(
      getPeriodRange(
        'day',
        'America/New_York',
        new Date('2026-11-01T17:00:00.000Z'),
      ),
    ).toEqual({
      from: '2026-11-01T04:00:00.000Z',
      to: '2026-11-02T05:00:00.000Z',
    })
  })

  it('does not constrain challenge-total ledger rows', () => {
    expect(getPeriodRange('challenge', 'UTC', now)).toBeNull()
  })
})
