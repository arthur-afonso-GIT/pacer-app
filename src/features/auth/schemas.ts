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

export const signInFormSchema = authSchema.extend({
  password: z.string().min(1, 'Informe sua senha.'),
  confirmPassword: z.string().optional(),
})
export const signUpFormSchema = authSchema
  .extend({
    confirmPassword: z.string().optional(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas precisam ser iguais.',
  })
export type AuthFormValues = z.infer<typeof signInFormSchema>

export const recoveryEmailSchema = authSchema.pick({ email: true })
export const newPasswordSchema = authSchema
  .pick({ password: true })
  .extend({ confirmPassword: z.string() })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'As senhas precisam ser iguais.',
  })
