import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  cancelIncompleteSubmission,
  createSubmission,
  uploadPrivateEvidence,
} from './submission.repository'

export function useCreateSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createSubmission,
    onSuccess: (submission) =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['submissions', submission.challenge_id],
        }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
      ]),
  })
}

export function useCancelIncompleteSubmission() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: cancelIncompleteSubmission,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['today'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
      ]),
  })
}

export function useUploadPrivateEvidence() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadPrivateEvidence,
    onSuccess: (evidence) =>
      queryClient.invalidateQueries({
        queryKey: ['evidence', evidence.submissionId],
      }),
  })
}
