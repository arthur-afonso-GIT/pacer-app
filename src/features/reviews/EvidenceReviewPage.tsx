import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Button, Surface, Textarea } from '@/design-system'
import {
  useEvidence,
  useEvidenceUrl,
  useReviewSubmission,
} from './review.queries'
import { reviewDecisionSchema, type ReviewDecisionInput } from './review.schema'

function EvidencePreview({ submissionId }: { submissionId: string }) {
  const evidence = useEvidence(submissionId)
  const first = evidence.data?.[0] ?? null
  const signed = useEvidenceUrl(first)
  if (evidence.isLoading) return <p>Carregando evidência privada…</p>
  if (!first) return <p>Nenhuma evidência anexada.</p>
  return (
    <section>
      <h2 className="mb-2 font-semibold">Foto da atividade</h2>
      {signed.data ? (
        <a href={signed.data} target="_blank" rel="noreferrer">
          <img
            src={signed.data}
            alt="Foto enviada como comprovação da atividade"
            className="max-h-96 w-full rounded-xl object-contain"
          />
        </a>
      ) : (
        <p>Preparando acesso seguro…</p>
      )}
      <p className="mt-1 text-xs text-slate-500">
        {first.media_type || 'Arquivo'} · {first.size_bytes ?? 0} bytes
      </p>
    </section>
  )
}

export interface EvidenceReviewPageProps {
  challengeId: string
  submissionId: string
  onReviewed?: () => void
}
export function EvidenceReviewPage({
  challengeId,
  submissionId,
  onReviewed,
}: EvidenceReviewPageProps) {
  const review = useReviewSubmission(challengeId)
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewDecisionInput>({
    resolver: zodResolver(reviewDecisionSchema),
    defaultValues: { decision: 'approved', reason: '' },
  })
  const decision = useWatch({ control, name: 'decision' })
  const submit = handleSubmit(async (input) => {
    await review.mutateAsync({ submissionId, input })
    onReviewed?.()
  })
  return (
    <main className="mx-auto w-full max-w-xl p-4 pb-24">
      <h1 className="mb-1 text-2xl font-bold">Validar atividade</h1>
      <p className="mb-6 text-sm text-slate-600">
        Seu voto é individual. Os pontos só serão liberados quando houver
        maioria entre os outros membros ativos.
      </p>
      <Surface className="mb-4 p-4">
        <EvidencePreview submissionId={submissionId} />
      </Surface>
      <Surface
        as="form"
        className="grid gap-4 p-4"
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        <fieldset>
          <legend className="mb-2 font-semibold">Decisão</legend>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <input type="radio" value="approved" {...register('decision')} />{' '}
              Validar
            </label>
            <label>
              <input type="radio" value="rejected" {...register('decision')} />{' '}
              Não validar
            </label>
          </div>
        </fieldset>
        <Textarea
          label="Comentário do voto"
          rows={4}
          {...(errors.reason?.message ? { error: errors.reason.message } : {})}
          {...register('reason')}
        />
        {review.error && (
          <p role="alert" className="text-sm text-red-700">
            A revisão não foi salva. Confirme sua permissão e tente novamente.
          </p>
        )}
        <Button
          type="submit"
          fullWidth
          variant={decision === 'rejected' ? 'danger' : 'primary'}
          loading={review.isPending}
        >
          Confirmar voto
        </Button>
      </Surface>
    </main>
  )
}
