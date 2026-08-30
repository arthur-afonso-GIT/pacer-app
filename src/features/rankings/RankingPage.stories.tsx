import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RankingView } from './RankingPage'

const meta = {
  title: 'Features/Rankings/RankingView',
  component: RankingView,
  args: { period: 'week', onPeriodChange: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RankingView>

export default meta
type Story = StoryObj<typeof meta>

export const WithMembers: Story = {
  args: {
    entries: [
      { userId: '1', displayName: 'Ana', avatarUrl: null, points: 84, rank: 1 },
      {
        userId: '2',
        displayName: 'Bruno',
        avatarUrl: null,
        points: 72,
        rank: 2,
      },
    ],
  },
}
export const Empty: Story = { args: { entries: [] } }
export const Loading: Story = { args: { loading: true } }
export const Error: Story = {
  args: { error: 'Não foi possível carregar o ranking.' },
}
