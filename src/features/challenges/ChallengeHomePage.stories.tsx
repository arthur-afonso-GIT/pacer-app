import type { Meta, StoryObj } from '@storybook/react-vite'
import { fn } from 'storybook/test'
import { ChallengeHomePage } from './ChallengeHomePage'

const meta = {
  title: 'Features/Challenges/ChallengeHomePage',
  component: ChallengeHomePage,
  args: { name: 'Movimento diário', habitCount: 3, onNavigate: fn() },
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ChallengeHomePage>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const NoHabits: Story = { args: { habitCount: 0 } }
export const LongName: Story = {
  args: {
    name: 'Desafio coletivo de movimento, hidratação e bem-estar durante todo o mês',
  },
}
