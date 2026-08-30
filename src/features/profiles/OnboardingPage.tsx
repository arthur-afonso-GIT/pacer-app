import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Surface } from '@/design-system'
import { useAuth } from '@/features/auth'
import { profileCopy } from './copy'
import { useUpsertProfile } from './queries'
import {
  profileSchema,
  type ProfileFormInput,
  type ProfileInput,
} from './schemas'

type Props = {
  saveProfile: (input: ProfileInput) => Promise<unknown>
  onComplete?: () => void
}
export function OnboardingPage({ saveProfile, onComplete }: Props) {
  const [requestError, setRequestError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormInput, unknown, ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { displayName: '', avatarUrl: '' },
  })
  const submit = handleSubmit(async (input) => {
    setRequestError(undefined)
    try {
      await saveProfile(input)
      onComplete?.()
    } catch {
      setRequestError(profileCopy.genericError)
    }
  })
  return (
    <main>
      <Surface as="section" variant="raised">
        <h1>{profileCopy.title}</h1>
        <p>{profileCopy.subtitle}</p>
        <form
          onSubmit={(event) => {
            void submit(event)
          }}
          noValidate
        >
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
            {...(errors.avatarUrl?.message
              ? { error: errors.avatarUrl.message }
              : {})}
            {...register('avatarUrl')}
          />
          {requestError && <p role="alert">{requestError}</p>}
          <Button type="submit" loading={isSubmitting}>
            {profileCopy.submit}
          </Button>
        </form>
      </Surface>
    </main>
  )
}
export function OnboardingRoute() {
  const { user } = useAuth()
  const navigate = useNavigate()
  if (!user)
    throw new Error('É necessário estar autenticado para completar o perfil.')
  const mutation = useUpsertProfile(user.id)
  return (
    <OnboardingPage
      saveProfile={(input) => mutation.mutateAsync(input)}
      onComplete={() => {
        void navigate('/', { replace: true })
      }}
    />
  )
}
