import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createEvidenceSignedUrl,
  listEvidence,
  listPendingReviews,
  reviewSubmission,
  type Evidence,
} from './review.repository'
import type { ReviewDecisionInput } from './review.schema'

export const useReviewQueue = (challengeId: string) =>
  useQuery({
    queryKey: ['reviews', challengeId],
    queryFn: () => listPendingReviews(challengeId),
    enabled: Boolean(challengeId),
  })

export const useEvidence = (submissionId: string) =>
  useQuery({
    queryKey: ['evidence', submissionId],
    queryFn: () => listEvidence(submissionId),
    enabled: Boolean(submissionId),
  })

export const useEvidenceUrl = (evidence: Evidence | null) =>
  useQuery({
    queryKey: ['evidence-url', evidence?.id],
    queryFn: () =>
      evidence
        ? createEvidenceSignedUrl(evidence)
        : Promise.reject(new Error('Evidência não informada.')),
    enabled: Boolean(evidence),
    staleTime: 4 * 60 * 1000,
  })

export function useReviewSubmission(challengeId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      submissionId,
      input,
    }: {
      submissionId: string
      input: ReviewDecisionInput
    }) => reviewSubmission(submissionId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['reviews', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['ranking', challengeId] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
      ]),
  })
}
