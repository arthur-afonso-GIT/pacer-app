import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createCalendarRepository } from './api'
import { CalendarView } from './CalendarPage'

describe('activity posts in calendar', () => {
  it('combines posts from each group with legacy submissions', async () => {
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      gte: vi.fn(),
      lt: vi.fn(),
      order: vi.fn(),
    }
    for (const fn of Object.values(builder)) fn.mockReturnValue(builder)
    builder.order
      .mockReturnValueOnce(builder)
      .mockResolvedValueOnce({ data: [], error: null })
    const rpc = vi.fn().mockResolvedValue({
      error: null,
      data: [
        {
          post_id: 'post',
          group_id: 'a',
          activity_name: 'Leitura',
          group_name: 'Amigos',
          timezone: 'America/Fortaleza',
          occurred_on: '2026-08-30',
          submitted_at: '2026-08-30T10:00:00Z',
          resolved_at: null,
          status: 'pending',
        },
        {
          post_id: 'post',
          group_id: 'b',
          activity_name: 'Leitura',
          group_name: 'Família',
          timezone: 'UTC',
          occurred_on: '2026-08-30',
          submitted_at: '2026-08-30T10:00:00Z',
          resolved_at: null,
          status: 'pending',
        },
      ],
    })
    const repo = createCalendarRepository({
      from: vi.fn().mockReturnValue(builder),
      rpc,
    } as never)
    const entries = await repo.listMonth('user', { year: 2026, month: 8 })
    expect(entries.map((entry) => entry.id)).toEqual(['post:a', 'post:b'])
    expect(rpc).toHaveBeenCalledWith('get_my_activity_calendar', {
      p_from: '2026-08-01',
      p_to: '2026-09-01',
    })
    render(
      <CalendarView
        month={{ year: 2026, month: 8 }}
        entries={entries}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getAllByText('Leitura')).toHaveLength(2)
    expect(screen.queryByText('Cancelar atividade')).not.toBeInTheDocument()
  })
})
