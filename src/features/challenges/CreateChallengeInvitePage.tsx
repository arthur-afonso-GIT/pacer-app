import { useState } from 'react'
import { Button, Input, Surface, Textarea } from '@/design-system'
import type { Group } from '@/features/groups'
import type { CreateChallengeInvitesInput } from './api'

const formText = (data: FormData, key: string) => {
  const value = data.get(key)
  return typeof value === 'string' ? value : ''
}

export function CreateChallengeInvitePage({
  groups,
  initialGroupIds = [],
  submitting = false,
  error,
  onSubmit,
}: {
  groups: readonly Group[]
  initialGroupIds?: readonly string[]
  submitting?: boolean
  error?: string
  onSubmit: (input: CreateChallengeInvitesInput) => void
}) {
  const [selected, setSelected] = useState(() => new Set(initialGroupIds))
  return (
    <section className="mx-auto grid w-full max-w-xl gap-5 py-6">
      <div>
        <p className="text-accent text-xs font-extrabold uppercase">
          Novo convite
        </p>
        <h1 className="mt-1 text-3xl font-black">Criar desafio</h1>
        <p className="text-secondary mt-2 text-sm">
          O convite será publicado nos grupos escolhidos. Cada pessoa decide se
          quer participar.
        </p>
      </div>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          const values = new FormData(event.currentTarget)
          const startsLocal = formText(values, 'startsLocal')
          const endsLocal = formText(values, 'endsLocal')
          onSubmit({
            name: formText(values, 'name').trim(),
            description: formText(values, 'description').trim(),
            startsAt: new Date(startsLocal).toISOString(),
            endsAt: new Date(endsLocal).toISOString(),
            groupIds: [...selected],
            reviewPolicy: 'any_other_member',
          })
        }}
      >
        <Input label="Nome do desafio" name="name" minLength={2} required />
        <Textarea label="Descrição" name="description" maxLength={2000} />
        <Input
          label="Início"
          name="startsLocal"
          type="datetime-local"
          required
        />
        <Input
          label="Prazo final"
          name="endsLocal"
          type="datetime-local"
          required
        />
        <fieldset className="grid gap-2">
          <legend className="text-sm font-black">Publicar nos grupos</legend>
          {groups.map((group) => (
            <Surface key={group.id} as="label" className="flex gap-3 p-3">
              <input
                type="checkbox"
                value={group.id}
                checked={selected.has(group.id)}
                onChange={(event) => {
                  const next = new Set(selected)
                  if (event.target.checked) next.add(group.id)
                  else next.delete(group.id)
                  setSelected(next)
                }}
              />
              <span>
                <strong className="block">{group.name}</strong>
                {group.description && (
                  <span className="text-secondary text-sm">
                    {group.description}
                  </span>
                )}
              </span>
            </Surface>
          ))}
        </fieldset>
        {error && <p role="alert">{error}</p>}
        <Button
          type="submit"
          fullWidth
          loading={submitting}
          disabled={selected.size === 0}
        >
          Publicar convite
        </Button>
      </form>
    </section>
  )
}
