import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeHubPage } from './ChallengeHubPage'

const invitation = {
  challenge_id: 'challenge-1',
  series_id: 'series-1',
  group_id: 'group-1',
  group_name: 'Faculdade',
  name: 'Sprint de estudos',
  description: 'Ler todos os dias',
  starts_at: '2026-09-01T12:00:00Z',
  ends_at: '2026-09-15T12:00:00Z',
  status: 'active' as const,
  participation_mode: 'opt_in',
  is_participant: false,
  is_creator: false,
  participant_count: 2,
  series_group_count: 1,
}

describe('ChallengeHubPage', () => {
  it('separates invitations and lets a group member opt in', async () => {
    const join = vi.fn()
    render(
      <ChallengeHubPage
        challenges={[invitation]}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onJoin={join}
        onDismiss={vi.fn()}
        onLeave={vi.fn()}
        onCancelSeries={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Convites (1)' }))
    expect(screen.getByText('Sprint de estudos')).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar no desafio' }),
    )
    expect(join).toHaveBeenCalledWith('challenge-1')
  })

  it('asks for confirmation before dismissing an invitation', async () => {
    const dismiss = vi.fn()
    render(
      <ChallengeHubPage
        challenges={[invitation]}
        onCreate={vi.fn()}
        onOpen={vi.fn()}
        onJoin={vi.fn()}
        onDismiss={dismiss}
        onLeave={vi.fn()}
        onCancelSeries={vi.fn()}
      />,
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Convites (1)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Agora não' }))
    expect(screen.getByText(/Ocultar o convite/)).toBeVisible()
    expect(dismiss).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    expect(dismiss).toHaveBeenCalledWith('challenge-1')
  })
})
