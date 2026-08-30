import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PeriodSwitcher, RankingView } from './RankingPage'

describe('PeriodSwitcher', () => {
  it('offers all ledger periods and announces the selected one', async () => {
    const onChange = vi.fn()
    render(<PeriodSwitcher value="week" onChange={onChange} />)

    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Mês' }))
    expect(onChange).toHaveBeenCalledWith('month')
  })
})

describe('RankingView', () => {
  it('renders shared ranks and signed totals in a mobile-first list', () => {
    render(
      <RankingView
        period="challenge"
        onPeriodChange={() => undefined}
        entries={[
          {
            userId: '1',
            displayName: 'Ana',
            avatarUrl: null,
            points: 5,
            rank: 1,
          },
          {
            userId: '2',
            displayName: 'Bia',
            avatarUrl: null,
            points: 5,
            rank: 1,
          },
          {
            userId: '3',
            displayName: 'Caio',
            avatarUrl: null,
            points: -2,
            rank: 3,
          },
        ]}
        statistics={{
          netPoints: 8,
          awardedPoints: 20,
          reversedPoints: -12,
          transactionCount: 3,
        }}
        consistency={{
          currentStreak: 2,
          bestStreak: 5,
          activeDays: 8,
          heatmap: [{ date: '2026-08-29', count: 1 }],
        }}
      />,
    )

    expect(screen.getAllByText('1º')).toHaveLength(2)
    expect(screen.getByText('-2 pts')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Ranking' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Estatísticas' })).toBeVisible()
    expect(screen.getByText('Pontos revertidos')).toBeVisible()
    expect(screen.getByText('12')).toBeVisible()
    expect(
      screen.getByRole('heading', { name: 'Sua consistência' }),
    ).toBeVisible()
    expect(screen.getByLabelText('Sequência de 2 dias')).toBeVisible()
  })
})
