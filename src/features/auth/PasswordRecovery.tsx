import { useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import type { z } from 'zod'
import { Button, Input, Surface } from '@/design-system'
import { requestPasswordReset, updatePassword } from './api'
import { useAuth } from './auth-context'
import { authErrorMessage } from './errors'
import { recoveryEmailSchema, newPasswordSchema } from './schemas'

function RecoveryLayout({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <main className="bg-canvas min-h-dvh px-4 py-10">
      <Surface
        className="mx-auto grid w-full max-w-md gap-5 p-6"
        variant="raised"
      >
        <h1 className="text-3xl font-black">{title}</h1>
        {children}
        <Link
          className="text-accent flex min-h-11 items-center justify-center font-bold"
          to="/entrar"
        >
          Voltar para entrar
        </Link>
      </Surface>
    </main>
  )
}

export function ForgotPasswordPage({
  requestReset = requestPasswordReset,
}: {
  requestReset?: (email: string) => Promise<unknown>
}) {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof recoveryEmailSchema>>({
    resolver: zodResolver(recoveryEmailSchema),
    defaultValues: { email: '' },
  })
  const submit = handleSubmit(async ({ email }) => {
    setError(undefined)
    try {
      await requestReset(email)
      setSent(true)
    } catch (cause) {
      setError(authErrorMessage(cause))
    }
  })
  return (
    <RecoveryLayout title="Recuperar senha">
      {sent ? (
        <p role="status">
          Se houver uma conta com esse e-mail, você receberá um link para
          redefinir a senha. Confira também o spam.
        </p>
      ) : (
        <>
          <p>Informe seu e-mail para receber um link de recuperação.</p>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={(event) => {
              void submit(event)
            }}
          >
            <Input
              label="E-mail"
              type="email"
              autoComplete="email"
              {...register('email')}
              {...(errors.email?.message
                ? { error: errors.email.message }
                : {})}
            />
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            <Button type="submit" fullWidth loading={isSubmitting}>
              Enviar link de recuperação
            </Button>
          </form>
        </>
      )}
    </RecoveryLayout>
  )
}

export function ResetPasswordPage({
  savePassword = updatePassword,
}: {
  savePassword?: (password: string) => Promise<unknown>
}) {
  const { session, loading } = useAuth()
  const location = useLocation()
  const [linkError] = useState(() => {
    const hash = new URLSearchParams(location.hash.slice(1))
    const search = new URLSearchParams(location.search)
    return (
      hash.has('error') ||
      hash.has('error_code') ||
      search.has('error') ||
      search.has('error_code')
    )
  })
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string>()
  const [visible, setVisible] = useState({
    password: false,
    confirmPassword: false,
  })
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof newPasswordSchema>>({
    resolver: zodResolver(newPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })
  const submit = handleSubmit(async ({ password }) => {
    if (!session || linkError) return
    setError(undefined)
    try {
      await savePassword(password)
      reset()
      setSaved(true)
    } catch (cause) {
      setError(authErrorMessage(cause))
    }
  })
  return (
    <RecoveryLayout title="Definir nova senha">
      {loading ? (
        <p role="status">Verificando link…</p>
      ) : saved ? (
        <p role="status">
          Senha atualizada. Sua nova senha já pode ser usada para entrar.
        </p>
      ) : !session || linkError ? (
        <>
          <p role="alert">
            Este link é inválido, expirou ou já foi usado. Abra o link mais
            recente enviado por e-mail ou solicite outro.
          </p>
          <Link
            to="/recuperar-senha"
            className="text-accent flex min-h-11 items-center font-bold"
          >
            Solicitar novo link
          </Link>
        </>
      ) : (
        <form
          className="grid gap-4"
          noValidate
          onSubmit={(event) => {
            void submit(event)
          }}
        >
          <p>Escolha uma senha de pelo menos 8 caracteres.</p>
          {(['password', 'confirmPassword'] as const).map((field) => (
            <div key={field} className="grid gap-1">
              <Input
                label={
                  field === 'password' ? 'Nova senha' : 'Confirmar nova senha'
                }
                type={visible[field] ? 'text' : 'password'}
                autoComplete="new-password"
                {...register(field)}
                {...(errors[field]?.message
                  ? { error: errors[field].message }
                  : {})}
              />
              <button
                type="button"
                className="text-accent min-h-11 text-right text-sm font-bold"
                aria-pressed={visible[field]}
                onClick={() =>
                  setVisible((current) => ({
                    ...current,
                    [field]: !current[field],
                  }))
                }
              >
                {visible[field] ? 'Ocultar' : 'Mostrar'}{' '}
                {field === 'password' ? 'nova senha' : 'confirmação'}
              </button>
            </div>
          ))}
          {error && (
            <p role="alert" className="text-red-700">
              {error}
            </p>
          )}
          <Button type="submit" fullWidth loading={isSubmitting}>
            Salvar nova senha
          </Button>
        </form>
      )}
    </RecoveryLayout>
  )
}
