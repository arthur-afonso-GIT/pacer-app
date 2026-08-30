import { z } from 'zod'
import type { Database } from '@/infrastructure/supabase/database.types'

const baseReviewSchema = z.object({
  reason: z.string().trim().min(3, 'Informe o motivo da decisão.').max(500),
})

export const reviewDecisionSchema = z.discriminatedUnion('decision', [
  baseReviewSchema.extend({
    decision: z.literal('approved'),
  }),
  baseReviewSchema.extend({
    decision: z.literal('rejected'),
    points: z.undefined().optional(),
  }),
])

export type ReviewDecisionInput = z.input<typeof reviewDecisionSchema>
export type ValidReviewDecision = z.output<typeof reviewDecisionSchema>
export type ReviewRpcArgs =
  Database['public']['Functions']['vote_submission']['Args']

export function toReviewRpcArgs(
  submissionId: string,
  input: ReviewDecisionInput,
): ReviewRpcArgs {
  const decision = reviewDecisionSchema.parse(input)
  return {
    p_submission_id: submissionId,
    p_decision: decision.decision,
    p_reason: decision.reason,
  }
}
