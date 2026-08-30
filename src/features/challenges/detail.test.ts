import { describe, expect, it } from 'vitest'
import { getEffectiveChallengeStatus, mapChallengeHabitOptions } from './detail'

describe('challenge detail mapping', () => {
  it('maps attached habits to submission options', () => {
    expect(
      mapChallengeHabitOptions([
        {
          id: 'attachment-1',
          points: 10,
          max_submissions_per_day: 1,
          habits: { name: 'Caminhar' },
        },
        {
          id: 'attachment-2',
          points: 5,
          max_submissions_per_day: 3,
          habits: { name: 'Beber água' },
        },
      ]),
    ).toEqual([
      {
        id: 'attachment-1',
        name: 'Caminhar',
        points: 10,
        maxSubmissionsPerDay: 1,
      },
      {
        id: 'attachment-2',
        name: 'Beber água',
        points: 5,
        maxSubmissionsPerDay: 3,
      },
    ])
  })
})

describe('effective challenge status', () => {
  const challenge = {
    status: 'active' as const,
    starts_at: '2026-08-30T12:00:00Z',
    ends_at: '2026-09-01T12:00:00Z',
  }

  it('is scheduled before the exact start instant', () => {
    expect(
      getEffectiveChallengeStatus(
        challenge,
        new Date('2026-08-30T11:59:59.999Z'),
      ),
    ).toBe('scheduled')
  })

  it('is active at the start and completed at the exact end instant', () => {
    expect(
      getEffectiveChallengeStatus(challenge, new Date('2026-08-30T12:00:00Z')),
    ).toBe('active')
    expect(
      getEffectiveChallengeStatus(challenge, new Date('2026-09-01T12:00:00Z')),
    ).toBe('completed')
  })
})
