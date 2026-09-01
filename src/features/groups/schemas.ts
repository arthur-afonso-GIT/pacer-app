import { z } from 'zod'

const isIanaTimezone = (value: string) => {
  try {
    new Intl.DateTimeFormat('pt-BR', { timeZone: value }).format()
    return value.includes('/') || value === 'UTC'
  } catch {
    return false
  }
}

export const groupSchema = z.object({
  name: z.string().trim().min(2, 'Informe pelo menos 2 caracteres').max(80),
  description: z
    .string()
    .trim()
    .min(3, 'Descreva o propósito do grupo em pelo menos 3 caracteres')
    .max(1000, 'A descrição deve ter no máximo 1000 caracteres'),
  timezone: z
    .string()
    .trim()
    .refine(isIanaTimezone, 'Informe um fuso horário IANA válido'),
})

export const inviteSchema = z.object({
  email: z.union([z.literal(''), z.email('E-mail inválido')]),
  role: z.enum(['member', 'admin']),
  expiresInDays: z.number().int().min(1).max(30),
})

export const inviteCodeSchema = z.object({
  code: z.string().trim().min(1, 'Informe o código do convite'),
})
export type GroupFormValues = z.infer<typeof groupSchema>
export type InviteFormValues = z.infer<typeof inviteSchema>
