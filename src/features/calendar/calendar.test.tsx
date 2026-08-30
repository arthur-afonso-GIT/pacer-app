import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CalendarView } from './CalendarPage'
import { calendarMonthRange, shiftCalendarMonth } from './calendar'

describe('calendar month', () => {
  it('crosses year boundaries with a semi-open date range', () => {
    const december = { year: 2026, month: 12 }
    expect(shiftCalendarMonth(december, 1)).toEqual({ year: 2027, month: 1 })
    expect(calendarMonthRange(december)).toEqual({
      from: '2026-12-01',
      to: '2027-01-01',
    })
  })
})

it('shows activities and changes the selected month', async () => {
  const previous = vi.fn()
  render(
    <CalendarView
      month={{ year: 2026, month: 8 }}
      entries={[
        {
          id: 'submission-1',
          occurredOn: '2026-08-29',
          submittedAt: '2026-08-29T12:00:00Z',
          status: 'approved',
          habitName: 'Caminhada',
          challengeName: '30 dias em movimento',
          groupName: 'Amigos',
          timezone: 'America/Fortaleza',
        },
      ]}
      onPrevious={previous}
      onNext={vi.fn()}
    />,
  )
  expect(screen.getByText('Caminhada')).toBeVisible()
  expect(screen.getByText('Aprovada')).toBeVisible()
  await userEvent.click(screen.getByRole('button', { name: 'Mês anterior' }))
  expect(previous).toHaveBeenCalledOnce()
})

it('requires confirmation before cancelling a pending activity', async () => {
  const cancel = vi.fn()
  render(
    <CalendarView
      month={{ year: 2026, month: 8 }}
      entries={[
        {
          id: 'pending-1',
          occurredOn: '2026-08-29',
          submittedAt: '2026-08-29T12:00:00Z',
          status: 'pending',
          habitName: 'Alongamento',
          challengeName: 'Movimento',
          groupName: 'Amigos',
          timezone: 'America/Fortaleza',
        },
      ]}
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onCancel={cancel}
    />,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Cancelar atividade' }),
  )
  expect(cancel).not.toHaveBeenCalled()
  expect(screen.getByText(/A ação não pode ser desfeita/)).toBeVisible()
  await userEvent.click(
    screen.getByRole('button', { name: 'Confirmar cancelamento' }),
  )
  expect(cancel).toHaveBeenCalledWith('pending-1')
})

it('allows a rejected activity to be disputed within seven days', async () => {
  const dispute = vi.fn()
  render(
    <CalendarView
      month={{ year: 2026, month: 8 }}
      now={new Date('2026-08-30T12:00:00Z')}
      entries={[
        {
          id: 'rejected-1',
          occurredOn: '2026-08-28',
          submittedAt: '2026-08-28T12:00:00Z',
          resolvedAt: '2026-08-29T12:00:00Z',
          status: 'rejected',
          habitName: 'Caminhada',
          challengeName: 'Movimento',
          groupName: 'Amigos',
          timezone: 'America/Fortaleza',
        },
      ]}
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onDispute={dispute}
    />,
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Contestar decisão' }),
  )
  const reason = screen.getByLabelText('Motivo da contestação')
  await userEvent.type(reason, 'A evidência mostra a atividade completa.')
  await userEvent.click(
    screen.getByRole('button', { name: 'Enviar contestação' }),
  )
  expect(dispute).toHaveBeenCalledWith(
    'rejected-1',
    'A evidência mostra a atividade completa.',
  )
})

it('does not offer disputes after the seven-day window', () => {
  render(
    <CalendarView
      month={{ year: 2026, month: 8 }}
      now={new Date('2026-08-30T12:00:00Z')}
      entries={[
        {
          id: 'old-rejection',
          occurredOn: '2026-08-01',
          submittedAt: '2026-08-01T12:00:00Z',
          resolvedAt: '2026-08-20T11:59:59Z',
          status: 'rejected',
          habitName: 'Caminhada',
          challengeName: 'Movimento',
          groupName: 'Amigos',
          timezone: 'America/Fortaleza',
        },
      ]}
      onPrevious={vi.fn()}
      onNext={vi.fn()}
      onDispute={vi.fn()}
    />,
  )
  expect(screen.queryByRole('button', { name: 'Contestar decisão' })).toBeNull()
})
