import { z } from 'zod'

export const authSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email('Informe um e-mail válido.')),
  password: z.string().min(8, 'A senha deve ter pelo menos 8 caracteres.'),
})

export type AuthCredentials = z.infer<typeof authSchema>
