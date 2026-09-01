import { useState } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Skeleton,
  Surface,
  Textarea,
} from '@/design-system'
import {
  useCanManageGroup,
  useChallengeLedger,
  useCorrectPoints,
  useReversePoints,
} from './queries'

const formatInstant = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))

export function LedgerPage({
  challengeId,
  groupId,
  userId,
}: {
  challengeId: string
  groupId: string
  userId: string
}) {
  const permission = useCanManageGroup(groupId, userId)
  const ledger = useChallengeLedger(challengeId, permission.data === true)
  const reversal = useReversePoints(challengeId)
  const correction = useCorrectPoints(challengeId)
  const [selectedAction, setSelectedAction] = useState<{
    id: string
    mode: 'correct' | 'reverse'
  }>()
  const [correctedPoints, setCorrectedPoints] = useState('')
  const [reason, setReason] = useState('')

  const clearAction = () => {
    setSelectedAction(undefined)
    setCorrectedPoints('')
    setReason('')
  }

  if (permission.isLoading) return <p role="status">Verificando permissão…</p>
  if (!permission.data)
    return (
      <EmptyState
        title="Acesso administrativo necessário"
        description="Somente administradores do grupo podem corrigir lançamentos de pontos."
      />
    )

  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
      <header>
        <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
          Histórico imutável
        </p>
        <h1 className="mt-2 text-3xl font-black">Lançamentos de pontos</h1>
        <p className="text-secondary mt-2">
          Correções criam uma reversão compensatória; o lançamento original
          nunca é apagado.
        </p>
      </header>

      {ledger.isLoading ? (
        <div className="grid gap-3" aria-label="Carregando lançamentos">
          <Skeleton height={110} className="w-full rounded-2xl" />
          <Skeleton height={110} className="w-full rounded-2xl" />
        </div>
      ) : ledger.error ? (
        <EmptyState
          title="Não foi possível carregar os lançamentos"
          description="Confirme sua conexão e tente novamente."
        />
      ) : !ledger.data?.length ? (
        <EmptyState
          title="Nenhum lançamento"
          description="Os pontos aprovados aparecerão aqui."
        />
      ) : (
        <ol className="grid gap-3">
          {ledger.data.map((entry) => {
            const reversible =
              entry.kind === 'award' && entry.points > 0 && !entry.reversed
            return (
              <li key={entry.id}>
                <Surface as="article" className="grid gap-3 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-black">{entry.displayName}</h2>
                      <time
                        className="text-secondary text-xs"
                        dateTime={entry.createdAt}
                      >
                        {formatInstant(entry.createdAt)}
                      </time>
                    </div>
                    <span
                      className={`font-black ${entry.points < 0 ? 'text-red-700' : 'text-accent'}`}
                    >
                      {entry.points > 0 ? '+' : ''}
                      {entry.points} pts
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Badge
                      tone={entry.kind === 'reversal' ? 'danger' : 'success'}
                    >
                      {entry.kind === 'reversal'
                        ? 'Reversão'
                        : entry.kind === 'adjustment'
                          ? 'Valor corrigido'
                          : 'Crédito'}
                    </Badge>
                    {entry.reversed && <Badge>Já revertido</Badge>}
                  </div>
                  {entry.reason && (
                    <p className="text-secondary text-sm">{entry.reason}</p>
                  )}
                  {reversible &&
                    (selectedAction?.id === entry.id ? (
                      <div className="grid gap-3 border-t border-[var(--ds-color-border)] pt-3">
                        {selectedAction.mode === 'correct' && (
                          <Input
                            label="Novo valor de pontos"
                            type="number"
                            min={1}
                            max={100000}
                            value={correctedPoints}
                            onChange={(event) =>
                              setCorrectedPoints(event.target.value)
                            }
                          />
                        )}
                        <Textarea
                          label={
                            selectedAction.mode === 'correct'
                              ? 'Motivo da correção'
                              : 'Motivo da remoção'
                          }
                          minLength={3}
                          maxLength={1000}
                          value={reason}
                          onChange={(event) => setReason(event.target.value)}
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="danger"
                            disabled={
                              reason.trim().length < 3 ||
                              (selectedAction.mode === 'correct' &&
                                (!Number.isInteger(Number(correctedPoints)) ||
                                  Number(correctedPoints) < 1 ||
                                  Number(correctedPoints) > 100000 ||
                                  Number(correctedPoints) === entry.points))
                            }
                            loading={reversal.isPending || correction.isPending}
                            onClick={() => {
                              if (selectedAction.mode === 'correct')
                                correction.mutate(
                                  {
                                    transactionId: entry.id,
                                    correctedPoints: Number(correctedPoints),
                                    reason: reason.trim(),
                                  },
                                  { onSuccess: clearAction },
                                )
                              else
                                reversal.mutate(
                                  {
                                    transactionId: entry.id,
                                    reason: reason.trim(),
                                  },
                                  { onSuccess: clearAction },
                                )
                            }}
                          >
                            {selectedAction.mode === 'correct'
                              ? 'Confirmar novo valor'
                              : 'Confirmar remoção'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={clearAction}
                          >
                            Voltar
                          </Button>
                        </div>
                        {(reversal.error || correction.error) && (
                          <p role="alert" className="text-sm text-red-700">
                            Não foi possível corrigir este lançamento.
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setSelectedAction({ id: entry.id, mode: 'correct' })
                            setCorrectedPoints(String(entry.points))
                          }}
                        >
                          Corrigir valor
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setSelectedAction({ id: entry.id, mode: 'reverse' })
                          }
                        >
                          Remover pontuação
                        </Button>
                      </div>
                    ))}
                </Surface>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
