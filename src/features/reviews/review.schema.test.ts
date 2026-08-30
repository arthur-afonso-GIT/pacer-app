import { reviewDecisionSchema, toReviewRpcArgs } from './review.schema'

describe('reviewDecisionSchema', () => {
  it('aceita aprovação sem escolher pontos manualmente', () => {
    const result = reviewDecisionSchema.safeParse({
      decision: 'approved',
      reason: 'Meta comprovada',
    })

    expect(result.success).toBe(true)
  })

  it('não aceita comentário curto', () => {
    const result = reviewDecisionSchema.safeParse({
      decision: 'rejected',
      reason: 'x',
    })

    expect(result.success).toBe(false)
  })

  it('envia somente o voto e o comentário ao RPC', () => {
    expect(
      toReviewRpcArgs('submission-id', {
        decision: 'rejected',
        reason: 'Evidência insuficiente',
      }),
    ).toEqual({
      p_submission_id: 'submission-id',
      p_decision: 'rejected',
      p_reason: 'Evidência insuficiente',
    })
  })
})
