import { supabase } from '@/infrastructure/supabase/client'
import type { Tables } from '@/infrastructure/supabase/database.types'
import {
  evidenceMetadataSchema,
  submissionSchema,
  type EvidenceMetadata,
  type SubmissionInput,
} from './submission.schema'

export type Submission = Tables<'submissions'>
export const PRIVATE_EVIDENCE_BUCKET = 'evidence'
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024
export const ALLOWED_EVIDENCE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

export function validateEvidenceFile(file: File) {
  if (!ALLOWED_EVIDENCE_TYPES.some((type) => type === file.type)) {
    throw new Error('Use uma foto JPEG, PNG, WebP.')
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    throw new Error('A evidência deve ter no máximo 10 MB.')
  }
  if (file.size === 0) throw new Error('O arquivo selecionado está vazio.')
}

export async function computeEvidenceSha256(file: File): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

function client() {
  if (!supabase) throw new Error('Supabase não está configurado.')
  return supabase
}

export async function createSubmission(
  input: SubmissionInput,
): Promise<Submission> {
  const value = submissionSchema.parse(input)
  const { data: auth, error: authError } = await client().auth.getUser()
  if (authError) throw authError

  const { data, error } = await client()
    .from('submissions')
    .insert({
      challenge_id: value.challengeId,
      challenge_habit_id: value.challengeHabitId,
      occurred_on: value.occurredOn,
      note: value.description || null,
      submitter_id: auth.user.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export interface EvidenceUpload {
  file: File
  submissionId: string
  sha256?: string | null
}

export async function uploadPrivateEvidence({
  file,
  submissionId,
  sha256 = null,
}: EvidenceUpload): Promise<EvidenceMetadata> {
  validateEvidenceFile(file)
  const evidenceHash = sha256 ?? (await computeEvidenceSha256(file))
  const extension =
    file.name
      .split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'bin'
  const storagePath = `${submissionId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await client()
    .storage.from(PRIVATE_EVIDENCE_BUCKET)
    .upload(
      storagePath,
      file,
      file.type ? { contentType: file.type, upsert: false } : { upsert: false },
    )
  if (uploadError) throw uploadError

  const metadata = evidenceMetadataSchema.parse({
    submissionId,
    storagePath,
    mediaType: file.type || null,
    sizeBytes: file.size,
    sha256: evidenceHash,
  })
  const { error } = await client().from('evidence').insert({
    submission_id: metadata.submissionId,
    storage_bucket: PRIVATE_EVIDENCE_BUCKET,
    storage_path: metadata.storagePath,
    media_type: metadata.mediaType,
    size_bytes: metadata.sizeBytes,
    sha256: metadata.sha256,
  })
  if (error) {
    await client().storage.from(PRIVATE_EVIDENCE_BUCKET).remove([storagePath])
    throw error
  }
  return metadata
}

export async function cancelIncompleteSubmission(
  submissionId: string,
): Promise<Submission> {
  const { data, error } = await client().rpc('cancel_submission', {
    p_submission_id: submissionId,
    p_reason: 'Upload de evidência não concluído',
  })
  if (error) throw error
  return data
}
