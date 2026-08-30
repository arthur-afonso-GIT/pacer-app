import { useState } from 'react'
import {
  Badge,
  Button,
  EmptyState,
  Skeleton,
  Surface,
  Textarea,
} from '@/design-system'
import {
  useCanManageGroup,
  useChallengeLedger,
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
  const [selectedId, setSelectedId] = useState<string>()
  const [reason, setReason] = useState('')

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
              entry.kind !== 'reversal' && entry.points > 0 && !entry.reversed
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
                      {entry.kind === 'reversal' ? 'Reversão' : 'Crédito'}
                    </Badge>
                    {entry.reversed && <Badge>Já revertido</Badge>}
                  </div>
                  {entry.reason && (
                    <p className="text-secondary text-sm">{entry.reason}</p>
                  )}
                  {reversible &&
                    (selectedId === entry.id ? (
                      <div className="grid gap-3 border-t border-[var(--ds-color-border)] pt-3">
                        <Textarea
                          label="Motivo da reversão"
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
                            disabled={reason.trim().length < 3}
                            loading={reversal.isPending}
                            onClick={() =>
                              reversal.mutate(
                                {
                                  transactionId: entry.id,
                                  reason: reason.trim(),
                                },
                                {
                                  onSuccess: () => {
                                    setSelectedId(undefined)
                                    setReason('')
                                  },
                                },
                              )
                            }
                          >
                            Confirmar reversão
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedId(undefined)
                              setReason('')
                            }}
                          >
                            Voltar
                          </Button>
                        </div>
                        {reversal.error && (
                          <p role="alert" className="text-sm text-red-700">
                            Não foi possível reverter este lançamento.
                          </p>
                        )}
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedId(entry.id)}
                      >
                        Corrigir pontuação
                      </Button>
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
