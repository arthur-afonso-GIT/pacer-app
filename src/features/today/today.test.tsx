import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { mapTodayChallenges, type TodayDashboard } from './api'
import { TodayView } from './TodayPage'

describe('mapTodayChallenges', () => {
  it('keeps only published challenges inside their active window', () => {
    const rows = [
      {
        challenge_id: 'active',
        challenges: {
          id: 'active',
          name: 'Passos',
          status: 'active' as const,
          starts_at: '2026-08-01T00:00:00Z',
          ends_at: '2026-09-01T00:00:00Z',
          groups: { name: 'Amigos', timezone: 'America/Fortaleza' },
          challenge_habits: [
            { id: 'habit-1', points: 10, habits: { name: 'Caminhada' } },
          ],
        },
      },
      {
        challenge_id: 'draft',
        challenges: {
          id: 'draft',
          name: 'Rascunho',
          status: 'draft' as const,
          starts_at: '2026-08-01T00:00:00Z',
          ends_at: '2026-09-01T00:00:00Z',
          groups: null,
          challenge_habits: [],
        },
      },
    ]
    expect(
      mapTodayChallenges(rows, new Date('2026-08-29T12:00:00Z')),
    ).toHaveLength(1)
  })
})

describe('TodayView', () => {
  const dashboard: TodayDashboard = {
    challenges: [
      {
        id: 'challenge-1',
        name: '30 dias em movimento',
        groupName: 'Amigos',
        timezone: 'America/Fortaleza',
        endsAt: '2026-09-01T00:00:00Z',
        habits: [{ id: 'habit-1', name: 'Caminhada', points: 10 }],
      },
    ],
    recentSubmissions: [],
    notifications: [],
  }

  it('opens the submission flow for an active challenge', async () => {
    const submit = vi.fn()
    render(
      <TodayView
        dashboard={dashboard}
        onOpenGroups={vi.fn()}
        onOpenChallenge={vi.fn()}
        onSubmit={submit}
      />,
    )
    expect(screen.getByText('30 dias em movimento')).toBeVisible()
    expect(screen.getByText('Caminhada')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Registrar' }))
    expect(submit).toHaveBeenCalledWith('challenge-1')
  })

  it('opens activity post creation from the daily dashboard', async () => {
    const createHabit = vi.fn()
    render(
      <TodayView
        dashboard={dashboard}
        onOpenGroups={vi.fn()}
        onOpenChallenge={vi.fn()}
        onSubmit={vi.fn()}
        onCreateHabit={createHabit}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Publicar atividade' }),
    )
    expect(createHabit).toHaveBeenCalledOnce()
  })

  it('guides users without active challenges to their groups', async () => {
    const openGroups = vi.fn()
    render(
      <TodayView
        dashboard={{ challenges: [], recentSubmissions: [], notifications: [] }}
        onOpenGroups={openGroups}
        onOpenChallenge={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Ver meus grupos' }),
    )
    expect(openGroups).toHaveBeenCalledOnce()
  })
})
