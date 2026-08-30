import { z } from 'zod'

export const submissionSchema = z.object({
  challengeId: z.uuid('Desafio inválido.'),
  challengeHabitId: z.uuid('Escolha um hábito.'),
  occurredOn: z.iso.date('Informe uma data válida.'),
  description: z
    .string()
    .trim()
    .min(3, 'Conte brevemente como foi a atividade.')
    .max(500, 'Use no máximo 500 caracteres.'),
})

export type SubmissionInput = z.input<typeof submissionSchema>
export type ValidSubmission = z.output<typeof submissionSchema>

export function dateInTimezone(timezone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export const evidenceMetadataSchema = z.object({
  submissionId: z.uuid(),
  storagePath: z.string().min(1),
  mediaType: z.string().max(120).nullable(),
  sizeBytes: z.number().int().nonnegative(),
  sha256: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .nullable(),
})
export type EvidenceMetadata = z.infer<typeof evidenceMetadataSchema>
