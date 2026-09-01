import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { WeeklyConsistencySummary } from './WeeklyConsistencySummary'
import { getConsistencyMilestone } from './weekly'

describe('weekly consistency', () => {
  it('uses progressive milestones without rewarding excessive volume', () => {
    expect(getConsistencyMilestone(0)).toBeUndefined()
    expect(getConsistencyMilestone(1)).toBe('start')
    expect(getConsistencyMilestone(2)).toBe('rhythm')
    expect(getConsistencyMilestone(3)).toBe('consistent')
    expect(getConsistencyMilestone(7)).toBe('consistent')
  })

  it('renders the civil week and approved activity summary by group', () => {
    render(
      <WeeklyConsistencySummary
        summaries={[
          {
            groupId: 'group-1',
            groupName: 'Amigos ativos',
            timezone: 'America/Fortaleza',
            weekStart: '2026-08-24',
            weekEnd: '2026-08-30',
            activeDays: 3,
            approvedActivities: 4,
            netPoints: 28,
            currentStreak: 3,
          },
        ]}
      />,
    )
    expect(screen.getByText('Sua semana')).toBeVisible()
    expect(screen.getByText('Amigos ativos')).toBeVisible()
    expect(screen.getByText('Consistência em alta')).toBeVisible()
    expect(screen.getByLabelText('Sequência atual: 3 dias')).toBeVisible()
    expect(screen.getByText('28')).toBeVisible()
  })
})
