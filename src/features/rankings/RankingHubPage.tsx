import { ArrowRight, Trophy } from 'lucide-react'
import { Button, EmptyState, Skeleton, Surface } from '@/design-system'
import type { TodayChallenge } from '@/features/today'

export function RankingHubPage({
  challenges,
  loading = false,
  error,
  onRetry,
  onOpen,
  onOpenGroups,
}: {
  challenges?: readonly TodayChallenge[]
  loading?: boolean
  error?: string
  onRetry?: () => void
  onOpen: (challengeId: string) => void
  onOpenGroups: () => void
}) {
  return (
    <section className="mx-auto grid w-full max-w-xl gap-6 py-6">
      <header>
        <p className="text-accent text-xs font-extrabold tracking-[0.18em] uppercase">
          Pontos confirmados
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-[-0.04em]">
          Rankings
        </h1>
        <p className="text-secondary mt-2">
          Escolha um desafio para acompanhar a classificação da turma.
        </p>
      </header>

      {loading ? (
        <div className="grid gap-3" aria-label="Carregando rankings">
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} height={92} className="w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Não foi possível carregar os rankings"
          description={error}
          action={
            onRetry ? (
              <Button onClick={onRetry}>Tentar novamente</Button>
            ) : undefined
          }
        />
      ) : !challenges?.length ? (
        <EmptyState
          icon={<Trophy aria-hidden size={36} />}
          title="Nenhum ranking disponível"
          description="Os rankings aparecem quando você participa de um desafio ativo."
          action={<Button onClick={onOpenGroups}>Ver meus grupos</Button>}
        />
      ) : (
        <div className="grid gap-3">
          {challenges.map((challenge) => (
            <Surface
              as="article"
              key={challenge.id}
              className="flex items-center gap-4 p-4"
            >
              <span className="bg-accent-soft text-accent grid size-11 place-items-center rounded-full">
                <Trophy aria-hidden size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-black">{challenge.name}</h2>
                <p className="text-secondary truncate text-sm">
                  {challenge.groupName}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={`Ver ranking de ${challenge.name}`}
                onClick={() => onOpen(challenge.id)}
              >
                <ArrowRight aria-hidden size={19} />
              </Button>
            </Surface>
          ))}
        </div>
      )}
    </section>
  )
}
