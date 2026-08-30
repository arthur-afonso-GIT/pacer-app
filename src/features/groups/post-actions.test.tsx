import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { GroupOverviewPage } from './pages'
import { createGroupsRepository, type GroupOverview } from './api'

const overview: GroupOverview = {
  group: {
    id: 'group',
    name: 'Amigos',
    description: null,
    timezone: 'UTC',
    created_by: 'author',
    created_at: '',
    updated_at: '',
  },
  members: [],
  challenges: [],
  leaderboard: [],
  feed: [
    {
      id: 'post',
      authorId: 'author',
      authorName: 'Ana',
      authorAvatarUrl: null,
      name: 'Leitura',
      suggestedPoints: 15,
      currentPoints: 10,
      photoUrl: '',
      status: 'pending',
      approvals: 0,
      rejections: 1,
      requiredVotes: 2,
      matchingProposals: 0,
      hasVoted: false,
      proposals: [],
      createdAt: '',
    },
  ],
}

describe('activity actions', () => {
  it('requires author confirmation and explains removal from every group and ranking', async () => {
    const remove = vi.fn()
    render(
      <GroupOverviewPage
        overview={overview}
        currentUserId="author"
        onDeletePost={remove}
        onVotePost={vi.fn()}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Rejeitar atividade' }),
    ).not.toBeInTheDocument()
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir atividade' }),
    )
    expect(remove).not.toHaveBeenCalled()
    expect(
      screen.getByText(/Os pontos que ela gerou serão removidos/),
    ).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Manter atividade' }),
    )
    expect(remove).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Excluir atividade' }),
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar exclusão' }),
    )
    expect(remove).toHaveBeenCalledWith('post')
  })
  it('lets other members reject with confirmation but not delete', async () => {
    const vote = vi.fn()
    render(
      <GroupOverviewPage
        overview={overview}
        currentUserId="member"
        onDeletePost={vi.fn()}
        onVotePost={vote}
      />,
    )
    expect(
      screen.queryByRole('button', { name: 'Excluir atividade' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByText('1 de 2 votos para rejeitar neste grupo.'),
    ).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', { name: 'Rejeitar atividade' }),
    )
    expect(vote).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar rejeição' }),
    )
    expect(vote).toHaveBeenCalledWith('post', 'rejected')
  })
  it('allows deletion of an approved post and disables mutations while pending', () => {
    const approved = {
      ...overview,
      feed: overview.feed.map((post) => ({ ...post, status: 'approved' })),
    }
    render(
      <GroupOverviewPage
        overview={approved}
        currentUserId="author"
        onDeletePost={vi.fn()}
        onVotePost={vi.fn()}
        postActionPending
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Excluir atividade' }),
    ).toBeDisabled()
    expect(
      screen.queryByRole('button', { name: 'Rejeitar atividade' }),
    ).not.toBeInTheDocument()
  })
  it('keeps proposals available after rejection and explains that they replace the vote', () => {
    const rejectedVote = {
      ...overview,
      feed: overview.feed.map((post) => ({ ...post, hasVoted: true })),
    }
    render(
      <GroupOverviewPage
        overview={rejectedVote}
        currentUserId="member"
        onProposePostPoints={vi.fn()}
        onVotePost={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/Uma nova proposta substitui seu voto/),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Propor' })).toBeEnabled()
    expect(
      screen.queryByRole('button', { name: 'Rejeitar atividade' }),
    ).not.toBeInTheDocument()
  })
  it('deletes through the author RPC then removes only the returned photo', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: 'author/photo.jpg', error: null })
    const remove = vi.fn().mockResolvedValue({ error: null })
    const repo = createGroupsRepository({
      rpc,
      storage: { from: vi.fn().mockReturnValue({ remove }) },
    } as never)
    expect(await repo.deletePost('post')).toEqual({ photoRemoved: true })
    expect(rpc).toHaveBeenCalledWith('delete_activity_post', {
      p_post_id: 'post',
    })
    expect(remove).toHaveBeenCalledWith(['author/photo.jpg'])
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'forbidden' } })
    await expect(repo.deletePost('other')).rejects.toThrow('forbidden')
    expect(remove).toHaveBeenCalledTimes(1)
    remove.mockRejectedValueOnce(new Error('offline'))
    expect(await repo.deletePost('post')).toEqual({ photoRemoved: false })
  })
})
