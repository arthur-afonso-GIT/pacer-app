import { supabase } from '@/infrastructure/supabase/client'
import type { Tables } from '@/infrastructure/supabase/database.types'
import { toReviewRpcArgs, type ReviewDecisionInput } from './review.schema'

export type ReviewQueueItem = Tables<'submissions'>
export type Evidence = Tables<'evidence'>

function client() {
  if (!supabase) throw new Error('Supabase não está configurado.')
  return supabase
}

export async function listPendingReviews(
  challengeId: string,
): Promise<ReviewQueueItem[]> {
  const { data, error } = await client().rpc('get_review_queue', {
    p_challenge_id: challengeId,
  })
  if (error) throw error
  return data
}

export async function listEvidence(submissionId: string): Promise<Evidence[]> {
  const { data, error } = await client()
    .from('evidence')
    .select('*')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data
}

export async function createEvidenceSignedUrl(
  evidence: Evidence,
  expiresInSeconds = 300,
): Promise<string> {
  const { data, error } = await client()
    .storage.from(evidence.storage_bucket)
    .createSignedUrl(evidence.storage_path, expiresInSeconds)
  if (error) throw error
  return data.signedUrl
}

export async function reviewSubmission(
  submissionId: string,
  input: ReviewDecisionInput,
): Promise<ReviewQueueItem> {
  const { data, error } = await client().rpc(
    'vote_submission',
    toReviewRpcArgs(submissionId, input),
  )
  if (error) throw error
  return data
}
