import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { GroupLeaderboard } from './GroupLeaderboard'

describe('group leaderboard', () => {
  it('shows totals, ties, zero scores and the current user', () => {
    render(
      <GroupLeaderboard
        currentUserId="b"
        entries={[
          {
            user_id: 'a',
            display_name: 'Ana',
            avatar_url: null,
            points: 1500,
            rank: 1,
          },
          {
            user_id: 'b',
            display_name: 'Bia',
            avatar_url: null,
            points: 1500,
            rank: 1,
          },
          {
            user_id: 'c',
            display_name: 'Caio',
            avatar_url: null,
            points: 0,
            rank: 2,
          },
        ]}
      />,
    )
    expect(screen.getAllByLabelText('Posição 1')).toHaveLength(2)
    expect(screen.getAllByText('1.500 pts')).toHaveLength(2)
    expect(screen.getByText('0 pts')).toBeVisible()
    expect(screen.getByText('(você)')).toBeVisible()
  })
  it('handles an empty group', () => {
    render(<GroupLeaderboard entries={[]} />)
    expect(screen.getByText('Nenhum participante no ranking.')).toBeVisible()
  })
})
