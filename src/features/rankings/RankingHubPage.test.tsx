import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import { RankingHubPage } from './RankingHubPage'

it('opens the selected challenge ranking', async () => {
  const open = vi.fn()
  render(
    <RankingHubPage
      challenges={[
        {
          id: 'challenge-1',
          name: '30 dias em movimento',
          groupName: 'Amigos',
          timezone: 'America/Fortaleza',
          endsAt: '2026-09-01T00:00:00Z',
          habits: [],
        },
      ]}
      onOpen={open}
      onOpenGroups={vi.fn()}
    />,
  )
  await userEvent.click(
    screen.getByRole('button', {
      name: 'Ver ranking de 30 dias em movimento',
    }),
  )
  expect(open).toHaveBeenCalledWith('challenge-1')
})
