import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, it, expect, vi } from 'vitest'
import { AuthContext } from '@/features/auth/auth-context'
import type { User } from '@supabase/supabase-js'
import { CalendarRoute } from './CalendarPage'

const { listMonth } = vi.hoisted(() => ({ listMonth: vi.fn() }))
vi.mock('@/infrastructure/supabase/client', () => ({ supabase: {} }))
vi.mock('./api', () => ({ createCalendarRepository: () => ({ listMonth }) }))

describe('calendar query errors', () => {
  it('shows a plain Supabase error instead of an empty month and allows retry', async () => {
    listMonth
      .mockRejectedValueOnce({
        code: 'PGRST200',
        message: 'relationship missing',
      })
      .mockResolvedValueOnce([
        {
          id: 'post:group',
          source: 'post',
          occurredOn: '2026-08-30',
          submittedAt: '2026-08-30T10:00:00Z',
          status: 'pending',
          habitName: 'Leitura',
          challengeName: 'Post no feed',
          groupName: 'Amigos',
          timezone: 'UTC',
        },
      ])
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider
          value={{
            session: null,
            user: { id: 'user' } as User,
            loading: false,
            signOut: vi.fn(),
          }}
        >
          <CalendarRoute />
        </AuthContext.Provider>
      </QueryClientProvider>,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível carregar o histórico',
    )
    expect(
      screen.queryByText('Nenhuma atividade neste mês'),
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    )
    expect(await screen.findByText('Leitura')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    queryClient.clear()
  })
})
