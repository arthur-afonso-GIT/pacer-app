import { Badge, EmptyState, Surface } from '@/design-system'
import { useReviewQueue } from './review.queries'

export interface ReviewQueuePageProps {
  challengeId: string
  onOpen: (submissionId: string) => void
}
export function ReviewQueuePage({ challengeId, onOpen }: ReviewQueuePageProps) {
  const queue = useReviewQueue(challengeId)
  return (
    <main className="mx-auto w-full max-w-xl p-4 pb-24">
      <h1 className="mb-1 text-2xl font-bold">Fila de revisão</h1>
      <p className="mb-6 text-sm text-slate-600">
        Cada membro vota uma vez. A atividade só pontua quando a maioria dos
        outros membros ativos validar.
      </p>
      {queue.isLoading ? (
        <p>Carregando atividades…</p>
      ) : queue.error ? (
        <p role="alert">Não foi possível carregar a fila.</p>
      ) : !queue.data?.length ? (
        <EmptyState
          title="Tudo revisado"
          description="Não há atividades pendentes ou contestadas agora."
        />
      ) : (
        <ul className="grid gap-3">
          {queue.data.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => onOpen(item.id)}
              >
                <Surface className="w-full p-4 text-left">
                  <div className="mb-2 flex items-center justify-between">
                    <strong>{item.occurred_on}</strong>
                    <Badge tone="warning">
                      {item.status === 'disputed' ? 'Contestada' : 'Pendente'}
                    </Badge>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-600">
                    {item.note || 'Descrição indisponível.'}
                  </p>
                </Surface>
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
