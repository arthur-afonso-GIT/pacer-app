import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { TodayView } from './TodayPage'

const meta = {
  title: 'Features/Today/TodayView',
  component: TodayView,
  args: { onOpenGroups: fn(), onOpenChallenge: fn(), onSubmit: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof TodayView>
export default meta
type Story = StoryObj<typeof meta>

export const ActiveChallenge: Story = {
  args: {
    dashboard: {
      challenges: [
        {
          id: 'c1',
          name: 'Movimento diário',
          groupName: 'Amigos',
          timezone: 'America/Fortaleza',
          endsAt: '2026-09-30T03:00:00Z',
          habits: [{ id: 'h1', name: 'Caminhada', points: 10 }],
        },
      ],
      recentSubmissions: [
        {
          id: 's1',
          challengeId: 'c1',
          habitName: 'Caminhada',
          status: 'pending',
          submittedAt: '2026-08-29T12:00:00Z',
          occurredOn: '2026-08-29',
        },
      ],
      notifications: [
        {
          id: 'n1',
          title: 'Atividade aprovada',
          body: 'Você recebeu 10 pontos.',
          createdAt: '2026-08-29T13:00:00Z',
          read: false,
        },
      ],
    },
  },
}
export const Empty: Story = {
  args: {
    dashboard: { challenges: [], recentSubmissions: [], notifications: [] },
  },
}
export const Loading: Story = { args: { loading: true } }
