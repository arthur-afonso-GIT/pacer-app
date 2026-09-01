import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Json } from '@/infrastructure/supabase/database.types'
import { notificationDestination, type AppNotification } from './api'
import { NotificationsView } from './NotificationsPage'

const notifications: AppNotification[] = [
  {
    id: 'notification-1',
    type: 'points',
    title: 'Atividade aprovada',
    body: 'Você recebeu 10 pontos.',
    createdAt: '2026-09-01T12:00:00Z',
    readAt: null,
    destination: '/desafio/challenge-1',
  },
  {
    id: 'notification-2',
    type: 'review',
    title: 'Atividade contestada',
    body: null,
    createdAt: '2026-08-31T12:00:00Z',
    readAt: '2026-08-31T13:00:00Z',
    destination: '/grupo/group-1',
  },
]

describe('notificationDestination', () => {
  it('prioritizes the group destination and falls back to a challenge', () => {
    expect(
      notificationDestination({
        group_id: 'group/1',
        challenge_id: 'challenge-1',
      }),
    ).toBe('/grupo/group%2F1')
    expect(notificationDestination({ challenge_id: 'challenge-1' })).toBe(
      '/desafio/challenge-1',
    )
    expect(notificationDestination([] as Json)).toBeNull()
  })
})

describe('NotificationsView', () => {
  it('marks one notification as read and can open its destination', async () => {
    const markRead = vi.fn()
    const open = vi.fn()
    render(
      <NotificationsView
        notifications={notifications}
        onRetry={vi.fn()}
        onOpen={open}
        onMarkRead={markRead}
        onMarkAllRead={vi.fn()}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Marcar como lida' }),
    )
    expect(markRead).toHaveBeenCalledWith('notification-1')
    await userEvent.click(
      screen.getByRole('button', { name: /Atividade contestada/ }),
    )
    expect(open).toHaveBeenCalledWith(notifications[1])
  })

  it('marks every unread notification at once', async () => {
    const markAllRead = vi.fn()
    render(
      <NotificationsView
        notifications={notifications}
        onOpen={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkAllRead={markAllRead}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: /Marcar todas como lidas/ }),
    )
    expect(markAllRead).toHaveBeenCalledOnce()
  })

  it('shows an explicit empty state', () => {
    render(
      <NotificationsView
        onOpen={vi.fn()}
        onMarkRead={vi.fn()}
        onMarkAllRead={vi.fn()}
      />,
    )
    expect(screen.getByText('Tudo tranquilo por aqui')).toBeVisible()
  })
})
