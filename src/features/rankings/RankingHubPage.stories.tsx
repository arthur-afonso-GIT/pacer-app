import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { RankingHubPage } from './RankingHubPage'

const meta = {
  title: 'Features/Rankings/RankingHubPage',
  component: RankingHubPage,
  args: { onOpen: fn(), onOpenGroups: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof RankingHubPage>
export default meta
type Story = StoryObj<typeof meta>
export const WithChallenges: Story = {
  args: {
    challenges: [
      {
        id: 'c1',
        name: 'Movimento diário',
        groupName: 'Amigos',
        timezone: 'America/Fortaleza',
        endsAt: '2026-09-30T03:00:00Z',
        habits: [],
      },
    ],
  },
}
export const Empty: Story = { args: { challenges: [] } }
