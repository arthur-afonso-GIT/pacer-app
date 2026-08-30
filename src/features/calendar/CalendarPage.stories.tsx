import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { CalendarView } from './CalendarPage'

const meta = {
  title: 'Features/Calendar/CalendarView',
  component: CalendarView,
  args: { month: { year: 2026, month: 8 }, onPrevious: fn(), onNext: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof CalendarView>
export default meta
type Story = StoryObj<typeof meta>

export const WithActivities: Story = {
  args: {
    entries: [
      {
        id: 's1',
        occurredOn: '2026-08-29',
        submittedAt: '2026-08-29T12:00:00Z',
        status: 'approved',
        habitName: 'Caminhada',
        challengeName: 'Movimento diário',
        groupName: 'Amigos',
        timezone: 'America/Fortaleza',
      },
    ],
  },
}
export const Empty: Story = { args: { entries: [] } }
export const Loading: Story = { args: { loading: true } }
