import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  IconButton,
  Skeleton,
  Surface,
  Textarea,
} from '@/design-system'
import { useAuth } from '@/features/auth'
import { supabase } from '@/infrastructure/supabase/client'
import type { CalendarEntry } from './api'
import { createCalendarRepository } from './api'
import {
  currentCalendarMonth,
  formatCalendarMonth,
  formatCivilDate,
  shiftCalendarMonth,
  type CalendarMonth,
} from './calendar'
import {
  useCalendarMonth,
  useCancelCalendarSubmission,
  useDisputeCalendarSubmission,
} from './queries'

const statusPresentation = {
  pending: { label: 'Pendente', tone: 'warning' },
  approved: { label: 'Aprovada', tone: 'success' },
  rejected: { label: 'Recusada', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'neutral' },
  disputed: { label: 'Em análise', tone: 'warning' },
} as const

export function CalendarView({
  month,
  entries = [],
  loading = false,
  error,
  cancelError,
  cancellingId,
  disputeError,
  disputingId,
  now = new Date(),
  onPrevious,
  onNext,
  onCancel,
  onDispute,
  onRetry,
}: {
  month: CalendarMonth
  entries?: readonly CalendarEntry[]
  loading?: boolean
  error?: string
  cancelError?: string
  cancellingId?: string
  disputeError?: string
  disputingId?: string
  now?: Date
  onPrevious: () => void
  onNext: () => void
  onCancel?: (submissionId: string) => void
  onDispute?: (submissionId: string, reason: string) => void
  onRetry?: () => void
}) {
  const [cancelCandidate, setCancelCandidate] = useState<string>()
  const [disputeCandidate, setDisputeCandidate] = useState<string>()
  const [disputeReason, setDisputeReason] = useState('')
  return (
    <section className="mx-auto grid w-full max-w-xl gap-6 py-6">
      <header>
        <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
          Seu histórico
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
          Calendário
        </h1>
        <p className="text-secondary mt-2">
          Acompanhe as atividades pela data registrada no fuso do grupo.
        </p>
      </header>

      <div className="flex items-center justify-between">
        <IconButton aria-label="Mês anterior" onClick={onPrevious}>
          <ChevronLeft aria-hidden size={20} />
        </IconButton>
        <h2 className="text-lg font-black capitalize" aria-live="polite">
          {formatCalendarMonth(month)}
        </h2>
        <IconButton aria-label="Próximo mês" onClick={onNext}>
          <ChevronRight aria-hidden size={20} />
        </IconButton>
      </div>

      {cancelError && (
        <p role="alert" className="text-sm font-bold text-red-700">
          Não foi possível cancelar a atividade. Tente novamente.
        </p>
      )}
      {disputeError && (
        <p role="alert" className="text-sm font-bold text-red-700">
          Não foi possível enviar a contestação. Verifique o prazo e tente
          novamente.
        </p>
      )}

      {loading ? (
        <div className="grid gap-3" aria-label="Carregando atividades">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} height={92} className="w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div role="alert" className="grid gap-3">
          <EmptyState
            title="Não foi possível carregar o histórico"
            description={error}
          />
          {onRetry && (
            <Button type="button" variant="secondary" onClick={onRetry}>
              Tentar novamente
            </Button>
          )}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={<CalendarDays aria-hidden size={36} />}
          title="Nenhuma atividade neste mês"
          description="As atividades registradas aparecerão aqui, inclusive enquanto aguardam revisão."
        />
      ) : (
        <ol className="grid gap-3">
          {entries.map((entry) => {
            const status = statusPresentation[entry.status]
            const canDispute =
              entry.source !== 'post' &&
              entry.status === 'rejected' &&
              Boolean(entry.resolvedAt) &&
              now.getTime() - new Date(entry.resolvedAt ?? 0).getTime() <=
                7 * 24 * 60 * 60 * 1000
            return (
              <li key={entry.id}>
                <Surface as="article" className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <time
                        dateTime={entry.occurredOn}
                        className="text-secondary text-xs font-bold capitalize"
                      >
                        {formatCivilDate(entry.occurredOn)}
                      </time>
                      <h3 className="mt-1 truncate font-black">
                        {entry.habitName}
                      </h3>
                    </div>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="text-secondary text-sm">
                    {entry.challengeName} · {entry.groupName}
                  </p>
                  {entry.source !== 'post' &&
                    entry.status === 'pending' &&
                    onCancel && (
                      <div className="border-subtle border-t pt-3">
                        {cancelCandidate === entry.id ? (
                          <div className="grid gap-2">
                            <p className="text-sm font-bold">
                              Cancelar esta atividade? A ação não pode ser
                              desfeita.
                            </p>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="danger"
                                loading={cancellingId === entry.id}
                                onClick={() => onCancel(entry.id)}
                              >
                                Confirmar cancelamento
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={cancellingId === entry.id}
                                onClick={() => setCancelCandidate(undefined)}
                              >
                                Voltar
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setCancelCandidate(entry.id)}
                          >
                            Cancelar atividade
                          </Button>
                        )}
                      </div>
                    )}
                  {canDispute && onDispute && (
                    <div className="border-subtle border-t pt-3">
                      {disputeCandidate === entry.id ? (
                        <div className="grid gap-3">
                          <Textarea
                            label="Motivo da contestação"
                            rows={3}
                            minLength={10}
                            maxLength={1000}
                            value={disputeReason}
                            onChange={(event) =>
                              setDisputeReason(event.target.value)
                            }
                            hint="Explique em pelo menos 10 caracteres por que a decisão deve ser revista."
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              loading={disputingId === entry.id}
                              disabled={disputeReason.trim().length < 10}
                              onClick={() =>
                                onDispute(entry.id, disputeReason.trim())
                              }
                            >
                              Enviar contestação
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              disabled={disputingId === entry.id}
                              onClick={() => {
                                setDisputeCandidate(undefined)
                                setDisputeReason('')
                              }}
                            >
                              Voltar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => setDisputeCandidate(entry.id)}
                        >
                          Contestar decisão
                        </Button>
                      )}
                    </div>
                  )}
                </Surface>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export function CalendarRoute() {
  const { user } = useAuth()
  const [month, setMonth] = useState(currentCalendarMonth)
  const repository = useMemo(() => {
    if (!supabase) throw new Error('Supabase não está configurado.')
    return createCalendarRepository(supabase)
  }, [])
  const entries = useCalendarMonth(repository, user?.id ?? '', month)
  const cancellation = useCancelCalendarSubmission(repository)
  const dispute = useDisputeCalendarSubmission(repository)
  return (
    <CalendarView
      month={month}
      entries={entries.data ?? []}
      loading={entries.isLoading}
      {...(entries.isError
        ? {
            error:
              'Não conseguimos buscar suas atividades. Tente novamente. Se o erro persistir, contate o suporte.',
          }
        : {})}
      onRetry={() => {
        void entries.refetch()
      }}
      {...(cancellation.error ? { cancelError: 'cancel-failed' } : {})}
      {...(cancellation.isPending
        ? { cancellingId: cancellation.variables }
        : {})}
      {...(dispute.error ? { disputeError: 'dispute-failed' } : {})}
      {...(dispute.isPending
        ? { disputingId: dispute.variables.submissionId }
        : {})}
      onPrevious={() => setMonth((value) => shiftCalendarMonth(value, -1))}
      onNext={() => setMonth((value) => shiftCalendarMonth(value, 1))}
      onCancel={(submissionId) => cancellation.mutate(submissionId)}
      onDispute={(submissionId, reason) =>
        dispute.mutate({ submissionId, reason })
      }
    />
  )
}
