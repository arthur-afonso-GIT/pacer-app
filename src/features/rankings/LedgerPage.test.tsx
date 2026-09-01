import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ reverse: vi.fn(), correct: vi.fn() }))

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
  useCorrectPoints: () => ({
    mutate: mocks.correct,
    isPending: false,
    error: null,
  }),
}))

import { LedgerPage } from './LedgerPage'

describe('LedgerPage', () => {
  it('requires a reason before removing points with a compensating reversal', async () => {
    render(
      <LedgerPage
        challengeId="challenge-1"
        groupId="group-1"
        userId="admin-1"
      />,
    )
    expect(screen.getByText('Ana Silva')).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Remover pontuação' }),
    )
    const confirm = screen.getByRole('button', { name: 'Confirmar remoção' })
    expect(confirm).toBeDisabled()
    await userEvent.type(
      screen.getByLabelText('Motivo da remoção'),
      'Duplicado',
    )
    await userEvent.click(confirm)
    expect(mocks.reverse.mock.calls[0]?.[0]).toEqual({
      transactionId: 'transaction-1',
      reason: 'Duplicado',
    })
  })

  it('requires a different valid value before correcting points', async () => {
    render(
      <LedgerPage
        challengeId="challenge-1"
        groupId="group-1"
        userId="admin-1"
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Corrigir valor' }),
    )
    const points = screen.getByLabelText('Novo valor de pontos')
    const confirm = screen.getByRole('button', {
      name: 'Confirmar novo valor',
    })
    await userEvent.type(
      screen.getByLabelText('Motivo da correção'),
      'Acordo do grupo',
    )
    expect(confirm).toBeDisabled()
    await userEvent.clear(points)
    await userEvent.type(points, '7')
    await userEvent.click(confirm)
    expect(mocks.correct.mock.calls[0]?.[0]).toEqual({
      transactionId: 'transaction-1',
      correctedPoints: 7,
      reason: 'Acordo do grupo',
    })
  })
})
