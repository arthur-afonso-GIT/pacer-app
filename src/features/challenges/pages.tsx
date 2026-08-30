import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Input, Surface, Textarea } from '@/design-system'
import type {
  Challenge,
  CreateChallengeInput,
  CreateGlobalHabitInput,
  CreateHabitInput,
  CreatedHabit,
  GlobalHabitResult,
} from './api'
import {
  challengeSchema,
  habitSchema,
  zonedLocalToIso,
  type ChallengeFormValues,
  type HabitFormValues,
} from './schemas'

const labels = {
  any_other_member: 'Qualquer outro membro',
  admins_only: 'Somente administradores',
  selected_reviewers: 'Revisores selecionados',
}
const fieldError = (error?: string) => (error ? { error } : {})
const Page = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) => (
  <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
    <h1 className="text-3xl font-black tracking-tight">{title}</h1>
    {children}
  </section>
)
const Feedback = ({ error, success }: { error: unknown; success: boolean }) =>
  error ? (
    <p role="alert">
      {error instanceof Error ? error.message : 'Não foi possível concluir.'}
    </p>
  ) : success ? (
    <p role="status">Salvo com sucesso.</p>
  ) : null

export function CreateChallengePage({
  groupId,
  userId,
  timezone,
  createChallenge,
  onCreated,
}: {
  groupId: string
  userId: string
  timezone: string
  createChallenge: (input: CreateChallengeInput) => Promise<Challenge>
  onCreated?: (challenge: Challenge) => void
}) {
  const mutation = useMutation({
    mutationFn: createChallenge,
    ...(onCreated ? { onSuccess: onCreated } : {}),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ChallengeFormValues>({
    resolver: zodResolver(challengeSchema),
    defaultValues: {
      name: '',
      description: '',
      startsLocal: '',
      endsLocal: '',
      reviewPolicy: 'any_other_member',
    },
  })
  const submit = (v: ChallengeFormValues) =>
    mutation.mutate({
      groupId,
      createdBy: userId,
      name: v.name,
      ...(v.description ? { description: v.description } : {}),
      startsAt: zonedLocalToIso(v.startsLocal, timezone),
      endsAt: zonedLocalToIso(v.endsLocal, timezone),
      reviewPolicy: v.reviewPolicy,
    })
  return (
    <Page title="Criar desafio">
      <Surface variant="subtle" className="p-3 text-sm">
        Datas no fuso do grupo: <strong>{timezone}</strong>
      </Surface>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit(submit)(event)
        }}
      >
        <Input
          label="Nome do desafio"
          {...fieldError(errors.name?.message)}
          {...register('name')}
        />
        <Textarea
          label="Descrição"
          {...fieldError(errors.description?.message)}
          {...register('description')}
        />
        <Input
          label="Início"
          type="datetime-local"
          {...fieldError(errors.startsLocal?.message)}
          {...register('startsLocal')}
        />
        <Input
          label="Fim"
          type="datetime-local"
          {...fieldError(errors.endsLocal?.message)}
          {...register('endsLocal')}
        />
        <label className="grid gap-1 text-sm font-bold">
          Política de revisão
          <select
            className="min-h-12 rounded-xl border px-3"
            {...register('reviewPolicy')}
          >
            {Object.entries(labels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" fullWidth loading={mutation.isPending}>
          Criar desafio
        </Button>
        <Feedback error={mutation.error} success={mutation.isSuccess} />
      </form>
    </Page>
  )
}

export function CreateHabitPage({
  challengeId,
  userId,
  createHabit,
  onCreated,
}: {
  challengeId: string
  userId: string
  createHabit: (input: CreateHabitInput) => Promise<CreatedHabit>
  onCreated?: (created: CreatedHabit) => void
}) {
  const mutation = useMutation({
    mutationFn: createHabit,
    ...(onCreated ? { onSuccess: onCreated } : {}),
  })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: '',
      description: '',
      points: 10,
      maxSubmissionsPerDay: 1,
    },
  })
  const submit = (v: HabitFormValues) =>
    mutation.mutate({
      challengeId,
      ownerId: userId,
      name: v.name,
      ...(v.description ? { description: v.description } : {}),
      points: v.points,
      maxSubmissionsPerDay: v.maxSubmissionsPerDay,
    })
  return (
    <Page title="Adicionar hábito">
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          void handleSubmit(submit)(event)
        }}
      >
        <Input
          label="Nome do hábito"
          {...fieldError(errors.name?.message)}
          {...register('name')}
        />
        <Textarea
          label="Descrição"
          {...fieldError(errors.description?.message)}
          {...register('description')}
        />
        <Input
          label="Pontos sugeridos"
          hint="A pontuação aprovada continua sendo decisão do revisor."
          type="number"
          min={1}
          {...fieldError(errors.points?.message)}
          {...register('points', { valueAsNumber: true })}
        />
        <Input
          label="Máximo por dia"
          type="number"
          min={1}
          {...fieldError(errors.maxSubmissionsPerDay?.message)}
          {...register('maxSubmissionsPerDay', { valueAsNumber: true })}
        />
        <Button type="submit" fullWidth loading={mutation.isPending}>
          Adicionar hábito
        </Button>
        <Feedback error={mutation.error} success={mutation.isSuccess} />
      </form>
    </Page>
  )
}

export function CreateGlobalHabitPage({
  createHabit,
}: {
  createHabit: (input: CreateGlobalHabitInput) => Promise<GlobalHabitResult>
}) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: createHabit,
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: ['groups'] }),
        queryClient.invalidateQueries({ queryKey: ['calendar'] }),
        queryClient.invalidateQueries({ queryKey: ['today'] }),
      ]),
  })
  const [photo, setPhoto] = useState<File>()
  const [photoError, setPhotoError] = useState<string>()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: {
      name: '',
      description: '',
      points: 10,
      maxSubmissionsPerDay: 1,
    },
  })
  const submit = (value: HabitFormValues) => {
    if (!photo) {
      setPhotoError('Adicione uma foto da atividade.')
      return
    }
    mutation.mutate({ name: value.name, points: value.points, photo })
  }

  return (
    <Page title="Publicar atividade">
      <Surface variant="subtle" className="grid gap-2 p-4 text-sm">
        <p className="font-bold">Um post, todos os seus grupos</p>
        <p className="text-secondary">
          Sua foto será publicada no feed de todos os grupos dos quais você
          participa. Cada grupo valida os pontos por maioria.
        </p>
      </Surface>
      <form
        className="grid gap-4"
        onSubmit={(event) => void handleSubmit(submit)(event)}
      >
        <fieldset className="grid gap-2">
          <legend className="ds-label">Foto da atividade</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="ds-button ds-button--primary ds-button--md cursor-pointer">
              <Camera aria-hidden size={18} /> Tirar foto
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(event) => {
                  setPhoto(event.target.files?.[0])
                  setPhotoError(undefined)
                }}
              />
            </label>
            <label className="ds-button ds-button--secondary ds-button--md cursor-pointer">
              <ImagePlus aria-hidden size={18} /> Galeria
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => {
                  setPhoto(event.target.files?.[0])
                  setPhotoError(undefined)
                }}
              />
            </label>
          </div>
          {photo && (
            <p className="text-secondary truncate text-sm">{photo.name}</p>
          )}
          {photoError && (
            <p role="alert" className="text-sm text-red-700">
              {photoError}
            </p>
          )}
        </fieldset>
        <Input
          label="Nome da atividade"
          {...fieldError(errors.name?.message)}
          {...register('name')}
        />
        <Input
          label="Pontos sugeridos"
          type="number"
          min={1}
          {...fieldError(errors.points?.message)}
          {...register('points', { valueAsNumber: true })}
        />
        <Button type="submit" fullWidth loading={mutation.isPending}>
          Publicar em todos os grupos
        </Button>
        {mutation.error && (
          <p role="alert">
            {typeof mutation.error === 'object' && 'message' in mutation.error
              ? mutation.error.message
              : 'Não foi possível publicar a atividade.'}
          </p>
        )}
        {mutation.data && (
          <Surface variant="subtle" className="p-4" aria-live="polite">
            <p role="status" className="font-bold">
              Atividade publicada nos seus grupos.
            </p>
            <p className="text-secondary mt-1 text-sm">
              A pontuação ficará pendente até a maioria validar.
            </p>
          </Surface>
        )}
      </form>
    </Page>
  )
}
