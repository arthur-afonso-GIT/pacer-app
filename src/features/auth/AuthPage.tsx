import { zodResolver } from '@hookform/resolvers/zod'
import {
  Check,
  Eye,
  EyeOff,
  ShieldCheck,
  Sparkles,
  UsersRound,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Input, Surface } from '@/design-system'
import { signIn as defaultSignIn, signUp as defaultSignUp } from './api'
import { authCopy } from './copy'
import {
  signInFormSchema,
  signUpFormSchema,
  type AuthCredentials,
  type AuthFormValues,
} from './schemas'
import { authErrorMessage } from './errors'

type Props = {
  signIn?: (value: AuthCredentials) => Promise<unknown>
  signUp?: (value: AuthCredentials) => Promise<unknown>
}

function responseHasSession(result: unknown) {
  if (!result || typeof result !== 'object' || !('session' in result))
    return false
  return Boolean(result.session)
}

const benefits: { icon: LucideIcon; label: string }[] = [
  { icon: UsersRound, label: 'Desafios com quem torce por você' },
  { icon: Check, label: 'Pontos transparentes e revisados pelo grupo' },
  { icon: ShieldCheck, label: 'Evidências privadas e acesso protegido' },
]

export function AuthPage({
  signIn = defaultSignIn,
  signUp = defaultSignUp,
}: Props) {
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn')
  const [requestError, setRequestError] = useState<string>()
  const [success, setSuccess] = useState<string>()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(
      mode === 'signUp' ? signUpFormSchema : signInFormSchema,
    ),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const changeMode = (nextMode: 'signIn' | 'signUp') => {
    if (isSubmitting) return
    reset({ email: getValues('email'), password: '', confirmPassword: '' })
    setShowPassword(false)
    setShowConfirmation(false)
    setMode(nextMode)
    setRequestError(undefined)
    setSuccess(undefined)
  }

  const submit = handleSubmit(async (value) => {
    setRequestError(undefined)
    setSuccess(undefined)
    try {
      const credentials = { email: value.email, password: value.password }
      if (mode === 'signIn') {
        await signIn(credentials)
        const state = location.state as { from?: { pathname?: string } } | null
        const destination = state?.from?.pathname?.startsWith('/')
          ? state.from.pathname
          : '/'
        await navigate(destination, { replace: true })
        return
      }

      const result = await signUp(credentials)
      if (responseHasSession(result)) {
        await navigate('/onboarding', { replace: true })
      } else {
        reset({ email: value.email, password: '', confirmPassword: '' })
        setShowPassword(false)
        setShowConfirmation(false)
        setSuccess(authCopy.signUpSuccess)
        setMode('signIn')
      }
    } catch (error) {
      setRequestError(authErrorMessage(error))
    }
  })

  return (
    <main className="bg-canvas min-h-dvh px-4 py-5 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(28rem,0.95fr)] lg:gap-10 lg:px-10 lg:py-10">
      <section className="bg-accent relative hidden overflow-hidden rounded-[2rem] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -top-24 -right-20 size-72 rounded-full bg-white/10" />
        <div className="absolute bottom-16 -left-20 size-56 rounded-full bg-white/8" />
        <div className="relative">
          <div className="flex items-center gap-3 text-lg font-black">
            <span className="grid size-10 place-items-center rounded-2xl bg-white/15">
              <Sparkles aria-hidden size={21} />
            </span>
            {authCopy.appName}
          </div>
          <p className="mt-20 text-xs font-extrabold tracking-[0.18em] text-white/75 uppercase">
            {authCopy.eyebrow}
          </p>
          <h1 className="mt-4 max-w-xl text-5xl leading-[1.04] font-black tracking-[-0.045em]">
            Sua próxima sequência começa hoje.
          </h1>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/80">
            Transforme hábitos saudáveis em uma experiência social que dá
            vontade de continuar.
          </p>
        </div>
        <div className="relative grid gap-3">
          {benefits.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-3 text-sm font-bold text-white/90"
            >
              <span className="grid size-8 place-items-center rounded-full bg-white/15">
                <Icon aria-hidden size={16} />
              </span>
              {label}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-md flex-col justify-center py-4 lg:max-w-lg">
        <div className="mb-8 flex items-center gap-3 lg:hidden">
          <span className="bg-accent text-on-accent grid size-11 place-items-center rounded-2xl shadow-sm">
            <Sparkles aria-hidden size={22} />
          </span>
          <div>
            <strong className="block text-lg font-black">
              {authCopy.appName}
            </strong>
            <span className="text-secondary text-xs font-bold">
              {authCopy.eyebrow}
            </span>
          </div>
        </div>

        <Surface
          as="section"
          variant="raised"
          className="rounded-[1.75rem] p-6 shadow-lg sm:p-8"
        >
          <p className="text-accent text-xs font-extrabold tracking-[0.16em] uppercase">
            {mode === 'signIn'
              ? 'Que bom ter você de volta'
              : 'Comece sua jornada'}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">
            {mode === 'signIn' ? 'Entrar na sua conta' : 'Crie sua conta'}
          </h1>
          <p className="text-secondary mt-3 leading-relaxed">
            {authCopy.subtitle}
          </p>

          <div
            className="bg-canvas mt-7 grid grid-cols-2 rounded-2xl p-1"
            aria-label="Tipo de acesso"
          >
            <button
              type="button"
              aria-pressed={mode === 'signIn'}
              onClick={() => changeMode('signIn')}
              className={`min-h-11 rounded-xl px-3 text-sm font-extrabold transition-colors ${mode === 'signIn' ? 'bg-surface text-primary shadow-sm' : 'text-secondary'}`}
            >
              {authCopy.signInTab}
            </button>
            <button
              type="button"
              aria-pressed={mode === 'signUp'}
              onClick={() => changeMode('signUp')}
              className={`min-h-11 rounded-xl px-3 text-sm font-extrabold transition-colors ${mode === 'signUp' ? 'bg-surface text-primary shadow-sm' : 'text-secondary'}`}
            >
              {authCopy.signUpTab}
            </button>
          </div>

          <p className="text-secondary mt-5 text-sm">
            {mode === 'signIn' ? authCopy.signInHint : authCopy.signUpHint}
          </p>
          <form
            className="mt-5 grid gap-4"
            onSubmit={(event) => {
              void submit(event)
            }}
            noValidate
          >
            <Input
              label={authCopy.email}
              type="email"
              autoComplete="email"
              placeholder="voce@exemplo.com"
              {...(errors.email?.message
                ? { error: errors.email.message }
                : {})}
              {...register('email')}
            />
            <div className="grid gap-1">
              <Input
                label={authCopy.password}
                type={showPassword ? 'text' : 'password'}
                autoComplete={
                  mode === 'signIn' ? 'current-password' : 'new-password'
                }
                placeholder={
                  mode === 'signUp' ? 'No mínimo 8 caracteres' : 'Sua senha'
                }
                {...(errors.password?.message
                  ? { error: errors.password.message }
                  : {})}
                {...register('password')}
              />
              <button
                type="button"
                className="text-accent flex min-h-11 items-center justify-end gap-2 text-sm font-bold"
                aria-pressed={showPassword}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <EyeOff aria-hidden size={18} />
                ) : (
                  <Eye aria-hidden size={18} />
                )}
                {showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              </button>
            </div>
            {mode === 'signIn' && (
              <Link
                to="/recuperar-senha"
                className="text-accent flex min-h-11 items-center justify-end text-sm font-bold"
              >
                Esqueci minha senha
              </Link>
            )}
            {mode === 'signUp' && (
              <div className="grid gap-1">
                <Input
                  label="Confirmar senha"
                  type={showConfirmation ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Digite a senha novamente"
                  {...(errors.confirmPassword?.message
                    ? { error: errors.confirmPassword.message }
                    : {})}
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  className="text-accent flex min-h-11 items-center justify-end gap-2 text-sm font-bold"
                  aria-pressed={showConfirmation}
                  aria-label={
                    showConfirmation
                      ? 'Ocultar confirmação de senha'
                      : 'Mostrar confirmação de senha'
                  }
                  onClick={() => setShowConfirmation((value) => !value)}
                >
                  {showConfirmation ? (
                    <EyeOff aria-hidden size={18} />
                  ) : (
                    <Eye aria-hidden size={18} />
                  )}
                  {showConfirmation
                    ? 'Ocultar confirmação'
                    : 'Mostrar confirmação'}
                </button>
              </div>
            )}
            {requestError && (
              <p
                role="alert"
                className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800"
              >
                {requestError}
              </p>
            )}
            {success && (
              <p
                role="status"
                className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800"
              >
                {success}
              </p>
            )}
            <Button type="submit" fullWidth size="lg" loading={isSubmitting}>
              {mode === 'signIn' ? authCopy.signIn : authCopy.signUp}
            </Button>
          </form>
          <div className="border-subtle mt-6 border-t pt-5 text-center">
            <button
              type="button"
              className="text-accent min-h-11 px-3 text-sm font-extrabold underline-offset-4 hover:underline"
              onClick={() =>
                changeMode(mode === 'signIn' ? 'signUp' : 'signIn')
              }
            >
              {mode === 'signIn'
                ? 'Ainda não tem conta? Criar agora'
                : 'Já tem uma conta? Entrar'}
            </button>
          </div>
        </Surface>
        <p className="text-secondary mx-auto mt-5 flex max-w-sm items-center gap-2 text-center text-xs leading-relaxed">
          <ShieldCheck aria-hidden className="text-accent shrink-0" size={16} />
          {authCopy.privacy}
        </p>
      </section>
    </main>
  )
}
