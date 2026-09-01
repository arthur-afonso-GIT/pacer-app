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
import { createChallengesRepository } from './api'

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

  it('publishes a photo activity to selected groups', async () => {
    const createHabit = vi.fn().mockResolvedValue({ postId: 'p1' })
    render(
      <CreateGlobalHabitPage
        createHabit={createHabit}
        groups={[
          { id: 'g1', name: 'Amigos', description: 'Exercícios' },
          { id: 'g2', name: 'Família', description: 'Rotina em família' },
        ]}
        initialGroupIds={['g1']}
      />,
      { wrapper },
    )
    const photo = new File(['photo'], 'treino.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('Galeria'), photo)
    await userEvent.type(screen.getByLabelText('Nome da atividade'), 'Meditar')
    await userEvent.click(
      screen.getByRole('button', { name: 'Publicar em 1 grupo' }),
    )
    expect(createHabit.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: 'Meditar',
        points: 10,
        photo,
        groupIds: ['g1'],
      }),
    )
    expect(
      await screen.findByText('Atividade publicada em 1 grupo.'),
    ).toBeVisible()
  })

  it('selects several destinations like forwarding a message', async () => {
    const createHabit = vi.fn().mockResolvedValue({ postId: 'p1' })
    render(
      <CreateGlobalHabitPage
        createHabit={createHabit}
        groups={[
          { id: 'g1', name: 'Corrida', description: 'Treinos' },
          { id: 'g2', name: 'Leitura', description: 'Livros' },
          { id: 'g3', name: 'Família', description: 'Casa' },
        ]}
      />,
      { wrapper },
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Selecionar todos' }),
    )
    expect(screen.getByText('3 selecionados')).toBeVisible()
    await userEvent.type(screen.getByLabelText('Buscar grupo'), 'Leitura')
    expect(screen.getByText('Leitura')).toBeVisible()
    expect(screen.queryByText('Corrida')).not.toBeInTheDocument()
    await userEvent.clear(screen.getByLabelText('Buscar grupo'))
    await userEvent.click(screen.getByText('Família'))
    expect(screen.getByText('2 selecionados')).toBeVisible()
  })

  it('requires a destination before publishing', async () => {
    const createHabit = vi.fn()
    render(
      <CreateGlobalHabitPage
        createHabit={createHabit}
        groups={[{ id: 'g1', name: 'Amigos', description: 'Rotina' }]}
      />,
      { wrapper },
    )
    const photo = new File(['photo'], 'treino.jpg', { type: 'image/jpeg' })
    await userEvent.upload(screen.getByLabelText('Galeria'), photo)
    await userEvent.type(screen.getByLabelText('Nome da atividade'), 'Meditar')
    await userEvent.click(
      screen.getByRole('button', { name: 'Escolha os grupos' }),
    )
    expect(
      await screen.findByText('Escolha pelo menos um grupo.'),
    ).toBeVisible()
    expect(createHabit).not.toHaveBeenCalled()
  })

  it('uploads once and sends only selected group ids to the transactional RPC', async () => {
    const upload = vi.fn().mockResolvedValue({ error: null })
    const remove = vi.fn().mockResolvedValue({ error: null })
    const rpc = vi.fn().mockResolvedValue({ data: 'post', error: null })
    const repository = createChallengesRepository({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id: 'author' } }, error: null }),
      },
      storage: { from: vi.fn().mockReturnValue({ upload, remove }) },
      rpc,
    } as never)
    const photo = new File(['photo'], 'treino.jpg', { type: 'image/jpeg' })
    expect(
      await repository.createGlobalHabit({
        name: 'Treino',
        points: 12,
        photo,
        groupIds: ['g2', 'g1'],
      }),
    ).toEqual({ postId: 'post' })
    expect(upload).toHaveBeenCalledOnce()
    expect(rpc).toHaveBeenCalledWith(
      'create_activity_post_for_groups',
      expect.objectContaining({
        p_name: 'Treino',
        p_suggested_points: 12,
        p_group_ids: ['g2', 'g1'],
      }),
    )
    expect(remove).not.toHaveBeenCalled()
  })
})
