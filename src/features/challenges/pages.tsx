import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Camera, ImagePlus } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
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
  groups,
  groupsLoading = false,
  groupsError,
  initialGroupIds = [],
  challenges = [],
  initialChallengeId,
}: {
  createHabit: (input: CreateGlobalHabitInput) => Promise<GlobalHabitResult>
  groups: { id: string; name: string; description: string | null }[]
  groupsLoading?: boolean
  groupsError?: string
  initialGroupIds?: string[]
  challenges?: Array<{
    challengeId: string
    name: string
    groupName: string
  }>
  initialChallengeId?: string
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
  const [groupError, setGroupError] = useState<string>()
  const [groupSearch, setGroupSearch] = useState('')
  const [destinationType, setDestinationType] = useState<
    'groups' | 'challenge'
  >(initialChallengeId ? 'challenge' : 'groups')
  const [challengeId, setChallengeId] = useState(initialChallengeId ?? '')
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(() =>
    initialGroupIds.filter((id) => groups.some((group) => group.id === id)),
  )
  const initialSelectionApplied = useRef(false)
  useEffect(() => {
    if (initialSelectionApplied.current || !groups.length) return
    initialSelectionApplied.current = true
    setSelectedGroupIds(
      initialGroupIds.filter((id) => groups.some((group) => group.id === id)),
    )
  }, [groups, initialGroupIds])
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
    if (destinationType === 'groups' && !selectedGroupIds.length) {
      setGroupError('Escolha pelo menos um grupo.')
      return
    }
    if (destinationType === 'challenge' && !challengeId) {
      setGroupError('Escolha um desafio.')
      return
    }
    mutation.mutate({
      name: value.name,
      points: value.points,
      photo,
      groupIds: destinationType === 'groups' ? selectedGroupIds : [],
      ...(destinationType === 'challenge' ? { challengeId } : {}),
    })
  }
  const visibleGroups = groups.filter((group) => {
    const query = groupSearch.trim().toLocaleLowerCase('pt-BR')
    return (
      !query ||
      group.name.toLocaleLowerCase('pt-BR').includes(query) ||
      group.description?.toLocaleLowerCase('pt-BR').includes(query)
    )
  })

  return (
    <Page title="Publicar atividade">
      <Surface variant="subtle" className="grid gap-2 p-4 text-sm">
        <p className="font-bold">Um post, os grupos que você escolher</p>
        <p className="text-secondary">
          Como ao encaminhar uma mensagem, escolha um ou vários destinos. Cada
          grupo negocia e valida os pontos separadamente.
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
        <fieldset className="grid gap-2">
          <legend className="ds-label">Tipo de publicação</legend>
          <div className="bg-surface-subtle grid grid-cols-2 gap-1 rounded-xl p-1">
            <button
              type="button"
              aria-pressed={destinationType === 'groups'}
              className={`min-h-11 rounded-lg text-sm font-bold ${destinationType === 'groups' ? 'bg-surface text-accent shadow-sm' : 'text-secondary'}`}
              onClick={() => {
                setDestinationType('groups')
                setGroupError(undefined)
              }}
            >
              Grupo(s)
            </button>
            <button
              type="button"
              aria-pressed={destinationType === 'challenge'}
              className={`min-h-11 rounded-lg text-sm font-bold ${destinationType === 'challenge' ? 'bg-surface text-accent shadow-sm' : 'text-secondary'}`}
              onClick={() => {
                setDestinationType('challenge')
                setGroupError(undefined)
              }}
            >
              Desafio
            </button>
          </div>
        </fieldset>
        <fieldset className="grid gap-3">
          <legend className="ds-label">
            {destinationType === 'groups' ? 'Publicar em' : 'Desafio escolhido'}
          </legend>
          {destinationType === 'challenge' ? (
            challenges.length ? (
              <select
                className="ds-input"
                aria-label="Escolher desafio"
                value={challengeId}
                onChange={(event) => {
                  setChallengeId(event.target.value)
                  setGroupError(undefined)
                }}
              >
                <option value="">Selecione um desafio</option>
                {challenges.map((challenge) => (
                  <option
                    key={challenge.challengeId}
                    value={challenge.challengeId}
                  >
                    {challenge.name} · {challenge.groupName}
                  </option>
                ))}
              </select>
            ) : (
              <p role="alert" className="text-sm text-red-700">
                Entre em um desafio ativo antes de publicar nele.
              </p>
            )
          ) : groupsLoading ? (
            <p role="status">Carregando grupos…</p>
          ) : groupsError ? (
            <p role="alert" className="text-sm text-red-700">
              {groupsError}
            </p>
          ) : groups.length === 0 ? (
            <p role="alert" className="text-sm text-red-700">
              Entre em um grupo antes de publicar uma atividade.
            </p>
          ) : (
            <>
              <Input
                label="Buscar grupo"
                type="search"
                value={groupSearch}
                onChange={(event) => setGroupSearch(event.target.value)}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-sm">
                  {selectedGroupIds.length} selecionado
                  {selectedGroupIds.length === 1 ? '' : 's'}
                </strong>
                <button
                  type="button"
                  className="text-accent min-h-11 px-2 text-sm font-bold"
                  onClick={() => {
                    setSelectedGroupIds(
                      selectedGroupIds.length === groups.length
                        ? []
                        : groups.map((group) => group.id),
                    )
                    setGroupError(undefined)
                  }}
                >
                  {selectedGroupIds.length === groups.length
                    ? 'Limpar seleção'
                    : 'Selecionar todos'}
                </button>
              </div>
              <div className="border-subtle grid max-h-64 gap-1 overflow-y-auto rounded-2xl border p-2">
                {visibleGroups.length ? (
                  visibleGroups.map((group) => (
                    <label
                      key={group.id}
                      aria-label={`Selecionar grupo ${group.name}`}
                      className="hover:bg-accent-soft flex min-h-14 cursor-pointer items-center gap-3 rounded-xl p-2"
                    >
                      <input
                        type="checkbox"
                        className="size-5"
                        checked={selectedGroupIds.includes(group.id)}
                        onChange={(event) => {
                          setSelectedGroupIds((current) =>
                            event.target.checked
                              ? [...current, group.id]
                              : current.filter((id) => id !== group.id),
                          )
                          setGroupError(undefined)
                        }}
                      />
                      <span className="min-w-0">
                        <strong className="block truncate">{group.name}</strong>
                        <span className="text-secondary block truncate text-xs">
                          {group.description || 'Sem descrição'}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="p-3 text-sm">Nenhum grupo encontrado.</p>
                )}
              </div>
            </>
          )}
          {groupError && (
            <p role="alert" className="text-sm text-red-700">
              {groupError}
            </p>
          )}
        </fieldset>
        <Button type="submit" fullWidth loading={mutation.isPending}>
          {destinationType === 'challenge'
            ? challengeId
              ? 'Publicar no desafio'
              : 'Escolha um desafio'
            : selectedGroupIds.length
              ? `Publicar em ${selectedGroupIds.length} grupo${selectedGroupIds.length === 1 ? '' : 's'}`
              : 'Escolha os grupos'}
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
              {destinationType === 'challenge'
                ? 'Atividade publicada no desafio.'
                : `Atividade publicada em ${selectedGroupIds.length} grupo${selectedGroupIds.length === 1 ? '' : 's'}.`}
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
