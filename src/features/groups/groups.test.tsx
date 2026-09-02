import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
  CreateGroupPage,
  CreateInvitePage,
  GroupOverviewPage,
  GroupsListPage,
  JoinGroupPage,
} from './pages'
import { groupSchema, inviteSchema } from './schemas'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={
      new QueryClient({
        defaultOptions: {
          queries: { retry: false },
          mutations: { retry: false },
        },
      })
    }
  >
    {children}
  </QueryClientProvider>
)

describe('group setup', () => {
  const editableOverview = {
    group: {
      id: 'g1',
      name: 'Amigos',
      description: 'Hábitos em conjunto',
      timezone: 'America/Fortaleza',
      created_by: 'owner',
      created_at: '',
      updated_at: '',
    },
    members: [
      {
        group_id: 'g1',
        user_id: 'owner',
        role: 'owner' as const,
        status: 'active' as const,
        joined_at: '',
        left_at: null,
        displayName: 'Ana',
        avatarUrl: null,
      },
      {
        group_id: 'g1',
        user_id: 'member',
        role: 'member' as const,
        status: 'active' as const,
        joined_at: '',
        left_at: null,
        displayName: 'Bia',
        avatarUrl: null,
      },
    ],
    challenges: [],
    feed: [],
    leaderboard: [],
  }
  it('exposes create and join actions from an empty group list', async () => {
    const create = vi.fn()
    const join = vi.fn()
    render(<GroupsListPage groups={[]} onCreate={create} onJoin={join} />, {
      wrapper,
    })
    await userEvent.click(screen.getByRole('button', { name: /^Criar grupo$/ }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar com convite' }),
    )
    expect(create).toHaveBeenCalledOnce()
    expect(join).toHaveBeenCalledOnce()
  })

  it('requires a useful group description', () => {
    expect(
      groupSchema.safeParse({
        name: 'Corrida',
        description: '',
        timezone: 'UTC',
      }).success,
    ).toBe(false)
    expect(
      groupSchema.safeParse({
        name: 'Corrida',
        description: 'Grupo para correr juntos',
        timezone: 'UTC',
      }).success,
    ).toBe(true)
  })

  it('allows an administrator to edit group details', async () => {
    const update = vi.fn()
    render(
      <GroupOverviewPage
        overview={editableOverview}
        currentUserId="owner"
        canManageMembers
        onUpdateGroup={update}
      />,
      { wrapper },
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Ajustes' }))
    await userEvent.clear(screen.getByLabelText('Descrição do grupo'))
    await userEvent.type(
      screen.getByLabelText('Descrição do grupo'),
      'Leitura e exercício todos os dias',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Salvar grupo' }))
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Amigos',
        description: 'Leitura e exercício todos os dias',
        timezone: 'America/Fortaleza',
      }),
    )
  })

  it('requires confirmation to leave and an owner successor', async () => {
    const leave = vi.fn()
    render(
      <GroupOverviewPage
        overview={editableOverview}
        currentUserId="owner"
        canManageMembers
        onLeaveGroup={leave}
      />,
      { wrapper },
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Ajustes' }))
    expect(screen.getByText(/transfira a propriedade/)).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Sair do grupo' }))
    expect(leave).not.toHaveBeenCalled()
    await userEvent.selectOptions(
      screen.getByLabelText('Novo proprietário'),
      'member',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar saída' }),
    )
    expect(leave).toHaveBeenCalledWith('member')
  })

  it('prevents the only owner from leaving without a successor', async () => {
    const leave = vi.fn()
    render(
      <GroupOverviewPage
        overview={{
          ...editableOverview,
          members: editableOverview.members.slice(0, 1),
        }}
        currentUserId="owner"
        onLeaveGroup={leave}
      />,
      { wrapper },
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Ajustes' }))
    expect(screen.getByText(/única pessoa do grupo/)).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Sair do grupo' }),
    ).not.toBeInTheDocument()
  })

  it('requires the owner to type the group name before deleting it', async () => {
    const removeGroup = vi.fn()
    render(
      <GroupOverviewPage
        overview={editableOverview}
        currentUserId="owner"
        onDeleteGroup={removeGroup}
      />,
      { wrapper },
    )
    await userEvent.click(screen.getByRole('tab', { name: 'Ajustes' }))
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir este grupo' }),
    )
    const confirmation = screen.getByLabelText('Digite Amigos para confirmar')
    const deleteButton = screen.getByRole('button', {
      name: 'Excluir grupo definitivamente',
    })
    expect(deleteButton).toBeDisabled()
    await userEvent.type(confirmation, 'Amigos')
    expect(deleteButton).toBeEnabled()
    await userEvent.click(deleteButton)
    expect(removeGroup).toHaveBeenCalledOnce()
  })

  it('opens on feed and separates ranking and members into tabs', async () => {
    render(
      <GroupOverviewPage
        overview={{
          group: {
            id: 'g1',
            name: 'Amigos',
            description: null,
            timezone: 'America/Fortaleza',
            created_by: 'u1',
            created_at: '',
            updated_at: '',
          },
          members: [
            {
              group_id: 'g1',
              user_id: 'u1',
              role: 'owner',
              status: 'active',
              joined_at: '',
              left_at: null,
              displayName: 'Ana Silva',
              avatarUrl: null,
            },
          ],
          challenges: [],
          feed: [],
          leaderboard: [],
        }}
      />,
      { wrapper },
    )
    expect(screen.getByRole('tab', { name: 'Feed' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.queryByText('Ana Silva')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Ranking' }))
    expect(screen.getByText('Ranking do grupo')).toBeVisible()
    expect(screen.queryByText('Feed do grupo')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: 'Membros' }))
    expect(screen.getByText('Ana Silva')).toBeVisible()
    expect(screen.getByText('Proprietário')).toBeVisible()
  })

  it('lets an administrator change another member role and remove them', async () => {
    const changeRole = vi.fn()
    const removeMember = vi.fn()
    render(
      <GroupOverviewPage
        overview={{
          group: {
            id: 'g1',
            name: 'Amigos',
            description: null,
            timezone: 'America/Fortaleza',
            created_by: 'owner',
            created_at: '',
            updated_at: '',
          },
          members: [
            {
              group_id: 'g1',
              user_id: 'admin',
              role: 'admin',
              status: 'active',
              joined_at: '',
              left_at: null,
              displayName: 'João Admin',
              avatarUrl: null,
            },
            {
              group_id: 'g1',
              user_id: 'member',
              role: 'member',
              status: 'active',
              joined_at: '',
              left_at: null,
              displayName: 'Bia Membro',
              avatarUrl: null,
            },
          ],
          challenges: [],
          feed: [],
          leaderboard: [],
        }}
        currentUserId="admin"
        canManageMembers
        onChangeRole={changeRole}
        onRemoveMember={removeMember}
      />,
      { wrapper },
    )

    await userEvent.click(screen.getByRole('tab', { name: 'Membros' }))
    expect(screen.queryByLabelText('Papel de João Admin')).toBeNull()
    await userEvent.selectOptions(
      screen.getByLabelText('Papel de Bia Membro'),
      'admin',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Remover' }))
    expect(changeRole).toHaveBeenCalledWith('member', 'admin')
    expect(removeMember).toHaveBeenCalledWith('member')
  })

  it('rejects an invalid IANA timezone', () => {
    expect(
      groupSchema.safeParse({
        name: 'Corrida',
        description: '',
        timezone: 'Brasil/São Paulo',
      }).success,
    ).toBe(false)
  })

  it('does not allow owner invitations', () => {
    expect(
      inviteSchema.safeParse({ email: '', role: 'owner', expiresInDays: 7 })
        .success,
    ).toBe(false)
  })

  it('submits a trimmed group with its timezone', async () => {
    const createGroup = vi.fn().mockResolvedValue({
      id: 'g1',
      name: 'Corrida',
      description: null,
      timezone: 'America/Sao_Paulo',
      created_by: 'u1',
      created_at: '',
      updated_at: '',
    })
    render(<CreateGroupPage createGroup={createGroup} />, {
      wrapper,
    })
    await userEvent.type(screen.getByLabelText('Nome do grupo'), '  Corrida  ')
    await userEvent.type(
      screen.getByLabelText('Descrição'),
      'Grupo para manter uma rotina de corrida.',
    )
    await userEvent.clear(screen.getByLabelText('Fuso horário'))
    await userEvent.type(
      screen.getByLabelText('Fuso horário'),
      'America/Sao_Paulo',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Criar grupo' }))
    expect(createGroup.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        name: 'Corrida',
        timezone: 'America/Sao_Paulo',
      }),
    )
  })

  it('normalizes and accepts an invite code', async () => {
    const joinByCode = vi.fn().mockResolvedValue('g1')
    render(<JoinGroupPage joinByCode={joinByCode} />, { wrapper })
    await userEvent.type(
      screen.getByLabelText('Código do convite'),
      '  ABC123  ',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Entrar no grupo' }),
    )
    expect(joinByCode.mock.calls[0]?.[0]).toBe('ABC123')
  })

  it('creates an expiring member invite and exposes its code', async () => {
    const createInvite = vi.fn().mockResolvedValue('PACER-ABC123')
    render(<CreateInvitePage groupId="g1" createInvite={createInvite} />, {
      wrapper,
    })
    await userEvent.click(screen.getByRole('button', { name: 'Gerar convite' }))
    expect(createInvite.mock.calls[0]?.[0]).toEqual({
      groupId: 'g1',
      email: '',
      role: 'member',
      expiresInDays: 7,
    })
    expect(await screen.findByText('PACER-ABC123')).toBeVisible()
  })
})
