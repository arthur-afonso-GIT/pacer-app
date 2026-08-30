import { z } from 'zod'

export const profileSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(2, 'Informe pelo menos 2 caracteres.')
    .max(80, 'Use no máximo 80 caracteres.'),
  avatarUrl: z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.url().safeParse(value).success,
      'Informe uma URL válida.',
    )
    .transform((value) => (value === '' ? null : value)),
  themePreference: z.enum(['system', 'light', 'dark']).default('system'),
  notificationsEnabled: z.boolean().default(true),
})

export type ProfileInput = z.infer<typeof profileSchema>
export type ProfileFormInput = z.input<typeof profileSchema>
