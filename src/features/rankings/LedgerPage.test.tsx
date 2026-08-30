import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ reverse: vi.fn() }))

vi.mock('./queries', () => ({
  useCanManageGroup: () => ({ data: true, isLoading: false }),
  useChallengeLedger: () => ({
    data: [
      {
        id: 'transaction-1',
        userId: 'user-1',
        displayName: 'Ana Silva',
        kind: 'award',
        points: 10,
        reason: null,
        createdAt: '2026-08-30T12:00:00Z',
        reversed: false,
      },
    ],
    isLoading: false,
    error: null,
  }),
  useReversePoints: () => ({
    mutate: mocks.reverse,
    isPending: false,
    error: null,
  }),
}))

import { LedgerPage } from './LedgerPage'

describe('LedgerPage', () => {
  it('requires a reason before creating a compensating reversal', async () => {
    render(
      <LedgerPage
        challengeId="challenge-1"
        groupId="group-1"
        userId="admin-1"
      />,
    )
    expect(screen.getByText('Ana Silva')).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Corrigir pontuação' }),
    )
    const confirm = screen.getByRole('button', { name: 'Confirmar reversão' })
    expect(confirm).toBeDisabled()
    await userEvent.type(
      screen.getByLabelText('Motivo da reversão'),
      'Duplicado',
    )
    await userEvent.click(confirm)
    expect(mocks.reverse.mock.calls[0]?.[0]).toEqual({
      transactionId: 'transaction-1',
      reason: 'Duplicado',
    })
  })
})
