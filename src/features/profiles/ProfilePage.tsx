import { zodResolver } from '@hookform/resolvers/zod'
import {
  CalendarDays,
  ImagePlus,
  LogOut,
  Mail,
  PencilLine,
  ShieldCheck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Navigate } from 'react-router-dom'
import { Avatar, Button, Input, Skeleton, Surface } from '@/design-system'
import { useAuth } from '@/features/auth'
import { uploadProfileAvatar, type Profile } from './api'
import { profileCopy } from './copy'
import { useProfile, useUpsertProfile } from './queries'
import {
  profileSchema,
  type ProfileFormInput,
  type ProfileInput,
} from './schemas'

type ProfilePageProps = {
  profile: Profile
  email?: string
  saving?: boolean
  signingOut?: boolean
  uploadingAvatar?: boolean
  onSave: (input: ProfileInput) => Promise<unknown>
  onAvatarUpload?: (file: File) => Promise<string>
  onSignOut: () => Promise<void>
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'P'

const memberSince = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))

export function ProfilePage({
  profile,
  email,
  saving = false,
  signingOut = false,
  uploadingAvatar = false,
  onSave,
  onAvatarUpload,
  onSignOut,
}: ProfilePageProps) {
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>(
    'idle',
  )
  const [signOutError, setSignOutError] = useState(false)
  const [avatarUploadError, setAvatarUploadError] = useState<string>()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url ?? '',
      themePreference: profile.theme_preference as 'system' | 'light' | 'dark',
      notificationsEnabled: profile.notifications_enabled,
    },
  })

  useEffect(() => {
    reset({
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url ?? '',
      themePreference: profile.theme_preference as 'system' | 'light' | 'dark',
      notificationsEnabled: profile.notifications_enabled,
    })
  }, [profile, reset])

  const displayName =
    useWatch({ control, name: 'displayName' }) || profile.display_name
  const avatarUrl = useWatch({ control, name: 'avatarUrl' }) || undefined
  const submit = handleSubmit(async (input) => {
    setSaveStatus('idle')
    try {
      await onSave(input)
      reset({
        displayName: input.displayName,
        avatarUrl: input.avatarUrl ?? '',
        themePreference: input.themePreference,
        notificationsEnabled: input.notificationsEnabled,
      })
      setSaveStatus('saved')
    } catch {
      setSaveStatus('error')
    }
  })

  const signOut = async () => {
    setSignOutError(false)
    try {
      await onSignOut()
    } catch {
      setSignOutError(true)
    }
  }

  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
      <header className="grid gap-1">
        <p className="text-accent text-sm font-extrabold tracking-wide uppercase">
          Conta
        </p>
        <h1 className="text-3xl font-black tracking-tight">
          {profileCopy.editTitle}
        </h1>
        <p className="text-secondary">{profileCopy.editSubtitle}</p>
      </header>

      <Surface variant="raised" className="grid gap-5 overflow-hidden p-5">
        <div className="flex items-center gap-4">
          <Avatar
            {...(avatarUrl ? { src: avatarUrl } : {})}
            alt={avatarUrl ? `Foto de ${displayName}` : ''}
            fallback={initials(displayName)}
            size="lg"
            className="ring-accent-soft ring-4"
          />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-black">{displayName}</h2>
            <p className="text-secondary flex items-center gap-1 text-sm">
              <ShieldCheck aria-hidden size={16} /> Perfil Pacer
            </p>
          </div>
        </div>

        {onAvatarUpload && (
          <div className="grid gap-2">
            <label className="ds-button ds-button--secondary ds-button--md ds-button--full cursor-pointer">
              <span className="flex items-center justify-center gap-2">
                <ImagePlus aria-hidden size={18} /> Escolher foto da galeria
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={uploadingAvatar}
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  setAvatarUploadError(undefined)
                  void onAvatarUpload(file)
                    .then((url) => {
                      setValue('avatarUrl', url, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    })
                    .catch((error: unknown) => {
                      setAvatarUploadError(
                        error instanceof Error
                          ? error.message
                          : 'Não foi possível enviar a foto.',
                      )
                    })
                }}
              />
            </label>
            {uploadingAvatar && (
              <p role="status" className="text-secondary text-sm font-bold">
                Enviando foto…
              </p>
            )}
            {avatarUploadError && (
              <p role="alert" className="text-sm font-bold text-red-700">
                {avatarUploadError}
              </p>
            )}
          </div>
        )}

        <form
          className="grid gap-4"
          onSubmit={(event) => {
            void submit(event)
          }}
          noValidate
        >
          <div className="text-secondary flex items-center gap-2 text-sm font-bold">
            <PencilLine aria-hidden size={17} /> Editar informações
          </div>
          <Input
            label={profileCopy.displayName}
            autoComplete="name"
            {...(errors.displayName?.message
              ? { error: errors.displayName.message }
              : {})}
            {...register('displayName')}
          />
          <Input
            label={profileCopy.avatarUrl}
            type="url"
            inputMode="url"
            hint="Use um endereço https:// para sua foto."
            {...(errors.avatarUrl?.message
              ? { error: errors.avatarUrl.message }
              : {})}
            {...register('avatarUrl')}
          />
          <div className="ds-field">
            <label className="ds-label" htmlFor="theme-preference">
              Aparência
            </label>
            <select
              id="theme-preference"
              className="ds-input"
              {...register('themePreference')}
            >
              <option value="system">Usar preferência do dispositivo</option>
              <option value="light">Tema claro</option>
              <option value="dark">Tema escuro</option>
            </select>
          </div>
          <label className="flex min-h-11 items-center gap-3 font-bold">
            <input
              type="checkbox"
              className="size-5 accent-[var(--ds-color-accent)]"
              {...register('notificationsEnabled')}
            />
            Mostrar notificações no aplicativo
          </label>
          {saveStatus === 'saved' && (
            <p role="status" className="text-positive text-sm font-bold">
              {profileCopy.saved}
            </p>
          )}
          {saveStatus === 'error' && (
            <p role="alert" className="text-sm font-bold text-red-700">
              {profileCopy.genericError}
            </p>
          )}
          <Button
            type="submit"
            fullWidth
            loading={saving || isSubmitting}
            disabled={!isDirty}
          >
            {profileCopy.save}
          </Button>
        </form>
      </Surface>

      <Surface
        as="section"
        className="grid gap-4 p-5"
        aria-labelledby="account-title"
      >
        <h2 id="account-title" className="text-lg font-black">
          {profileCopy.account}
        </h2>
        <dl className="grid gap-4">
          {email && (
            <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
              <Mail aria-hidden className="text-secondary" size={20} />
              <div className="min-w-0">
                <dt className="text-secondary text-xs font-bold uppercase">
                  {profileCopy.email}
                </dt>
                <dd className="m-0 truncate font-semibold">{email}</dd>
              </div>
            </div>
          )}
          <div className="grid grid-cols-[auto_1fr] items-center gap-x-3">
            <CalendarDays aria-hidden className="text-secondary" size={20} />
            <div>
              <dt className="text-secondary text-xs font-bold uppercase">
                {profileCopy.memberSince}
              </dt>
              <dd className="m-0 font-semibold capitalize">
                {memberSince(profile.created_at)}
              </dd>
            </div>
          </div>
        </dl>
        <div className="border-subtle border-t pt-4">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            loading={signingOut}
            onClick={() => void signOut()}
          >
            <LogOut aria-hidden size={18} /> {profileCopy.signOut}
          </Button>
          {signOutError && (
            <p
              role="alert"
              className="mt-2 text-center text-sm font-bold text-red-700"
            >
              {profileCopy.signOutError}
            </p>
          )}
        </div>
      </Surface>
    </section>
  )
}

export function ProfilePageSkeleton() {
  return (
    <section
      className="mx-auto grid w-full max-w-xl gap-5 py-6"
      aria-label="Carregando perfil"
    >
      <Skeleton width="45%" height={36} />
      <Surface className="grid gap-5 p-5">
        <div className="flex items-center gap-4">
          <Skeleton width={56} height={56} className="rounded-full" />
          <Skeleton width="55%" height={24} />
        </div>
        <Skeleton width="100%" height={44} />
        <Skeleton width="100%" height={44} />
      </Surface>
    </section>
  )
}

export function ProfileRoute() {
  const { user, signOut } = useAuth()
  const profileQuery = useProfile(user?.id)
  const mutation = useUpsertProfile(user?.id ?? '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  if (!user)
    throw new Error('É necessário estar autenticado para ver o perfil.')
  if (profileQuery.isLoading) return <ProfilePageSkeleton />
  if (profileQuery.error) {
    return (
      <section className="mx-auto grid max-w-xl gap-4 py-8 text-center">
        <p role="alert">{profileCopy.loadError}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => void profileQuery.refetch()}
        >
          {profileCopy.retry}
        </Button>
      </section>
    )
  }
  if (!profileQuery.data) {
    return <Navigate to="/onboarding" replace />
  }
  return (
    <ProfilePage
      profile={profileQuery.data}
      {...(user.email ? { email: user.email } : {})}
      saving={mutation.isPending}
      uploadingAvatar={uploadingAvatar}
      onSave={(input) => mutation.mutateAsync(input)}
      onAvatarUpload={async (file) => {
        setUploadingAvatar(true)
        try {
          return await uploadProfileAvatar(user.id, file)
        } finally {
          setUploadingAvatar(false)
        }
      }}
      onSignOut={signOut}
    />
  )
}
