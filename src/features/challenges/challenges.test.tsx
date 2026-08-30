import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  CreateChallengePage,
  CreateGlobalHabitPage,
  CreateHabitPage,
} from './pages'
import { challengeSchema, habitSchema, zonedLocalToIso } from './schemas'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('challenge and habit setup', () => {
  it('converts group-local dates to an absolute instant', () => {
    expect(zonedLocalToIso('2026-08-29T09:00', 'America/Sao_Paulo')).toBe(
      '2026-08-29T12:00:00.000Z',
    )
  })

  it('rejects nonexistent and duplicated daylight-saving times', () => {
    expect(() =>
      zonedLocalToIso('2026-03-08T02:30', 'America/New_York'),
    ).toThrow('não existe')
    expect(() =>
      zonedLocalToIso('2026-11-01T01:30', 'America/New_York'),
    ).toThrow('ambíguo')
  })

  it('requires the challenge end after its start', () => {
    expect(
      challengeSchema.safeParse({
        name: 'Agosto',
        description: '',
        startsLocal: '2026-08-30T10:00',
        endsLocal: '2026-08-29T10:00',
        reviewPolicy: 'admins_only',
      }).success,
    ).toBe(false)
  })

  it('requires positive points and daily limit', () => {
    expect(
      habitSchema.safeParse({
        name: 'Água',
        description: '',
        points: 0,
        maxSubmissionsPerDay: 0,
      }).success,
    ).toBe(false)
  })

  it('submits timezone-aware challenge dates and policy', async () => {
    const createChallenge = vi.fn().mockResolvedValue({ id: 'c1' })
    render(
      <CreateChallengePage
        groupId="g1"
        userId="u1"
        timezone="America/Sao_Paulo"
        createChallenge={createChallenge}
      />,
      { wrapper },
    )
    await userEvent.type(
      screen.getByLabelText('Nome do desafio'),
      'Desafio 30 dias',
    )
    await userEvent.type(screen.getByLabelText('Início'), '2026-08-29T09:00')
    await userEvent.type(screen.getByLabelText('Fim'), '2026-09-29T09:00')
    await userEvent.selectOptions(
      screen.getByLabelText('Política de revisão'),
      'admins_only',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Criar desafio' }))
    expect(createChallenge.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        startsAt: '2026-08-29T12:00:00.000Z',
        reviewPolicy: 'admins_only',
      }),
    )
  })

  it('creates a habit already attached to the challenge', async () => {
    const createHabit = vi
      .fn()
      .mockResolvedValue({ habit: { id: 'h1' }, attachment: { id: 'a1' } })
    render(
      <CreateHabitPage
        challengeId="c1"
        userId="u1"
        createHabit={createHabit}
      />,
      { wrapper },
    )
    await userEvent.type(screen.getByLabelText('Nome do hábito'), 'Beber água')
    await userEvent.clear(screen.getByLabelText('Pontos sugeridos'))
    await userEvent.type(screen.getByLabelText('Pontos sugeridos'), '10')
    await userEvent.click(
      screen.getByRole('button', { name: 'Adicionar hábito' }),
    )
    expect(createHabit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ challengeId: 'c1', ownerId: 'u1', points: 10 }),
    )
  })

  it('publishes a photo activity to all groups', async () => {
    const createHabit = vi.fn().mockResolvedValue({ postId: 'p1' })
    render(<CreateGlobalHabitPage createHabit={createHabit} />, { wrapper })
    const photo = new File(['photo'], 'treino.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('Galeria'), photo)
    await userEvent.type(screen.getByLabelText('Nome da atividade'), 'Meditar')
    await userEvent.click(
      screen.getByRole('button', { name: 'Publicar em todos os grupos' }),
    )
    expect(createHabit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({ name: 'Meditar', points: 10, photo }),
    )
    expect(
      await screen.findByText('Atividade publicada nos seus grupos.'),
    ).toBeVisible()
  })
})
