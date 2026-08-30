import { zodResolver } from '@hookform/resolvers/zod'
import { Camera, ImagePlus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button, Input, Surface, Textarea } from '@/design-system'
import {
  useCancelIncompleteSubmission,
  useCreateSubmission,
  useUploadPrivateEvidence,
} from './submission.queries'
import { submissionSchema, type SubmissionInput } from './submission.schema'
import { validateEvidenceFile } from './submission.repository'

export interface HabitOption {
  id: string
  name: string
}
export interface SubmissionPageProps {
  challengeId: string
  habits: HabitOption[]
  today?: string
}

export function SubmissionPage({
  challengeId,
  habits,
  today = new Date().toISOString().slice(0, 10),
}: SubmissionPageProps) {
  const create = useCreateSubmission()
  const upload = useUploadPrivateEvidence()
  const cancelIncomplete = useCancelIncompleteSubmission()
  const [evidenceFile, setEvidenceFile] = useState<File>()
  const [photoPreview, setPhotoPreview] = useState<string>()
  const [requestError, setRequestError] = useState<string>()
  const [success, setSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SubmissionInput>({
    resolver: zodResolver(submissionSchema),
    defaultValues: { challengeId, occurredOn: today, description: '' },
  })

  useEffect(
    () => () => {
      if (photoPreview) URL.revokeObjectURL(photoPreview)
    },
    [photoPreview],
  )

  const selectPhoto = (file?: File) => {
    setRequestError(undefined)
    if (!file) return
    try {
      validateEvidenceFile(file)
      setEvidenceFile(file)
      setPhotoPreview(URL.createObjectURL(file))
    } catch (error) {
      setEvidenceFile(undefined)
      setPhotoPreview(undefined)
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Não foi possível usar a foto.',
      )
    }
  }

  const submit = handleSubmit(async (values) => {
    setRequestError(undefined)
    setSuccess(false)
    let createdSubmissionId: string | undefined
    try {
      if (!evidenceFile) throw new Error('Adicione uma foto da atividade.')
      validateEvidenceFile(evidenceFile)
      const submission = await create.mutateAsync(values)
      createdSubmissionId = submission.id
      await upload.mutateAsync({
        file: evidenceFile,
        submissionId: submission.id,
      })
      reset({ challengeId, occurredOn: today, description: '' })
      setEvidenceFile(undefined)
      setPhotoPreview(undefined)
      setSuccess(true)
    } catch (error) {
      if (evidenceFile && createdSubmissionId) {
        try {
          await cancelIncomplete.mutateAsync(createdSubmissionId)
        } catch {
          setRequestError(
            'A evidência falhou e não foi possível cancelar o registro automaticamente. Verifique o Calendário.',
          )
          return
        }
      }
      setRequestError(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir. Tente novamente.',
      )
    }
  })

  return (
    <main className="mx-auto w-full max-w-xl p-4 pb-24">
      <h1 className="mb-1 text-2xl font-bold">Registrar atividade</h1>
      <p className="mb-6 text-sm text-slate-600">
        Publique uma foto real da atividade. Os pontos entram quando a maioria
        dos outros membros do grupo validar o check-in.
      </p>
      <Surface
        as="form"
        className="grid gap-4 p-4"
        onSubmit={(event) => {
          void submit(event)
        }}
      >
        <input type="hidden" {...register('challengeId')} />
        <label className="ds-field">
          <span className="ds-label">Hábito</span>
          <select
            className="ds-input"
            {...register('challengeHabitId')}
            defaultValue=""
          >
            <option value="" disabled>
              Selecione um hábito
            </option>
            {habits.map((habit) => (
              <option key={habit.id} value={habit.id}>
                {habit.name}
              </option>
            ))}
          </select>
          {errors.challengeHabitId && (
            <span className="ds-error" role="alert">
              {errors.challengeHabitId.message}
            </span>
          )}
        </label>
        <Input
          label="Data da atividade"
          type="date"
          max={today}
          {...(errors.occurredOn?.message
            ? { error: errors.occurredOn.message }
            : {})}
          {...register('occurredOn')}
        />
        <Textarea
          label="Descrição"
          rows={4}
          placeholder="Conte brevemente como foi"
          {...(errors.description?.message
            ? { error: errors.description.message }
            : {})}
          {...register('description')}
        />
        <fieldset className="grid gap-3">
          <legend className="ds-label">Foto da atividade (obrigatória)</legend>
          <div className="grid grid-cols-2 gap-2">
            <label className="ds-button ds-button--primary ds-button--md cursor-pointer">
              <Camera aria-hidden size={18} /> Tirar foto
              <input
                key={`camera-${evidenceFile?.name ?? 'empty'}`}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                onChange={(event) => selectPhoto(event.target.files?.[0])}
              />
            </label>
            <label className="ds-button ds-button--secondary ds-button--md cursor-pointer">
              <ImagePlus aria-hidden size={18} /> Galeria
              <input
                key={`gallery-${evidenceFile?.name ?? 'empty'}`}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => selectPhoto(event.target.files?.[0])}
              />
            </label>
          </div>
          {photoPreview ? (
            <figure className="grid gap-2">
              <img
                src={photoPreview}
                alt="Prévia da foto da atividade"
                className="max-h-80 w-full rounded-xl object-contain"
              />
              <figcaption className="text-secondary truncate text-xs">
                {evidenceFile?.name}
              </figcaption>
            </figure>
          ) : (
            <p className="text-secondary text-xs">
              Tire uma foto agora ou escolha uma imagem da galeria. Máximo de 10
              MB.
            </p>
          )}
        </fieldset>
        {requestError && (
          <p role="alert" className="text-sm text-red-700">
            {requestError}
          </p>
        )}
        {success && (
          <p role="status" className="text-positive text-sm font-bold">
            Check-in enviado. Agora ele aguarda a maioria do grupo.
          </p>
        )}
        <Button
          type="submit"
          fullWidth
          loading={create.isPending || upload.isPending}
        >
          Enviar para revisão
        </Button>
      </Surface>
    </main>
  )
}
