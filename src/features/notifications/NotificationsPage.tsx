import { Bell, CheckCheck, ChevronRight } from 'lucide-react'
import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, EmptyState, Skeleton, Surface } from '@/design-system'
import { useAuth } from '@/features/auth'
import { supabase } from '@/infrastructure/supabase/client'
import { createNotificationsRepository, type AppNotification } from './api'
import { useNotificationActions, useNotifications } from './queries'

const dateTime = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

export function NotificationsView({
  notifications = [],
  loading = false,
  error,
  actionPending = false,
  onRetry,
  onOpen,
  onMarkRead,
  onMarkAllRead,
}: {
  notifications?: AppNotification[]
  loading?: boolean
  error?: string
  actionPending?: boolean
  onRetry?: () => void
  onOpen: (notification: AppNotification) => void
  onMarkRead: (notificationId: string) => void
  onMarkAllRead: () => void
}) {
  const unread = notifications.filter((item) => !item.readAt).length
  return (
    <section className="mx-auto grid w-full max-w-2xl gap-6 py-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
            Atualizações
          </p>
          <h1 className="mt-2 text-4xl leading-tight font-black tracking-[-0.04em]">
            Notificações
          </h1>
          <p className="text-secondary mt-2">
            Acompanhe decisões, pontos e novidades dos seus grupos.
          </p>
        </div>
        {unread > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={actionPending}
            onClick={onMarkAllRead}
          >
            <CheckCheck aria-hidden size={18} /> Marcar todas como lidas
          </Button>
        )}
      </header>

      {loading ? (
        <div className="grid gap-3" aria-label="Carregando notificações">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} height={112} className="w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar as notificações"
          description={error}
          action={
            onRetry ? (
              <Button onClick={onRetry}>Tentar novamente</Button>
            ) : undefined
          }
        />
      ) : notifications.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden size={34} />}
          title="Tudo tranquilo por aqui"
          description="Quando seus grupos tiverem novidades, elas aparecerão nesta tela."
        />
      ) : (
        <Surface
          as="ul"
          className="divide-y divide-[var(--ds-color-border)] px-5"
        >
          {notifications.map((notification) => (
            <li key={notification.id} className="flex items-start gap-3 py-4">
              <span
                className={`mt-2 size-2 shrink-0 rounded-full ${notification.readAt ? 'bg-subtle' : 'bg-accent'}`}
                aria-label={notification.readAt ? 'Lida' : 'Não lida'}
              />
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onOpen(notification)}
              >
                <span className="block font-black">{notification.title}</span>
                {notification.body && (
                  <span className="text-secondary mt-1 block text-sm">
                    {notification.body}
                  </span>
                )}
                <time
                  className="text-secondary mt-2 block text-xs"
                  dateTime={notification.createdAt}
                >
                  {dateTime.format(new Date(notification.createdAt))}
                </time>
              </button>
              {!notification.readAt ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={actionPending}
                  onClick={() => onMarkRead(notification.id)}
                >
                  Marcar como lida
                </Button>
              ) : notification.destination ? (
                <ChevronRight
                  className="text-secondary mt-2"
                  aria-hidden
                  size={20}
                />
              ) : null}
            </li>
          ))}
        </Surface>
      )}
    </section>
  )
}

export function NotificationsRoute() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const repository = useMemo(() => {
    if (!supabase) throw new Error('Supabase não está configurado.')
    return createNotificationsRepository(supabase)
  }, [])
  const userId = user?.id ?? ''
  const notifications = useNotifications(repository, userId)
  const actions = useNotificationActions(repository, userId)
  const openNotification = (notification: AppNotification) => {
    const navigateAfterRead = () => {
      if (notification.destination) void navigate(notification.destination)
    }
    if (notification.readAt) navigateAfterRead()
    else
      actions.markRead.mutate(notification.id, { onSuccess: navigateAfterRead })
  }
  return (
    <NotificationsView
      notifications={notifications.data ?? []}
      loading={notifications.isLoading}
      {...(notifications.error instanceof Error
        ? { error: notifications.error.message }
        : {})}
      actionPending={
        actions.markRead.isPending || actions.markAllRead.isPending
      }
      onRetry={() => void notifications.refetch()}
      onOpen={openNotification}
      onMarkRead={(id) => actions.markRead.mutate(id)}
      onMarkAllRead={() => actions.markAllRead.mutate()}
    />
  )
}
