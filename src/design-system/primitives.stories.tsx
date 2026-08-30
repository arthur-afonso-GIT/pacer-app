import type { Meta, StoryObj } from '@storybook/react'
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  IconButton,
  Input,
  PointBadge,
  Skeleton,
  StreakIndicator,
  Surface,
  Textarea,
} from './index'
import './primitives.css'

const meta = {
  title: 'Design system/Primitives',
  component: Button,
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Button>
export default meta
type Story = StoryObj<typeof meta>
export const Buttons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
      <Button size="sm">Small</Button>
      <Button size="lg">Large</Button>
      <IconButton aria-label="More options">•••</IconButton>
    </div>
  ),
}
export const Fields: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 360 }}>
      <Input
        label="Goal"
        hint="A short, measurable goal"
        placeholder="Run 5 km"
      />
      <Input
        label="Email"
        error="Enter a valid email address"
        defaultValue="bad@"
      />
      <Input label="Disabled" disabled defaultValue="Unavailable" />
      <Textarea
        label="Reflection"
        hint="Long content wraps without changing the layout"
        defaultValue={'A long reflection '.repeat(12)}
      />
      <Textarea label="Required note" error="A note is required" />
    </div>
  ),
}
export const IdentityAndStatus: Story = {
  render: () => (
    <div
      style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        maxWidth: 520,
        flexWrap: 'wrap',
      }}
    >
      <Avatar fallback="AR" />
      <Avatar fallback="Very long fallback" size="lg" />
      <Badge>Draft</Badge>
      <Badge tone="success">Complete</Badge>
      <Badge tone="warning">At risk</Badge>
      <Badge tone="danger">Very long status content that wraps safely</Badge>
      <PointBadge points={25} />
      <PointBadge points={-3} />
      <StreakIndicator days={7} />
    </div>
  ),
}
export const ContainersAndFeedback: Story = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, width: 480, maxWidth: '90vw' }}>
      <Surface>
        Outlined surface with long content that remains readable and wraps
        naturally.
      </Surface>
      <Surface variant="raised">Raised surface</Surface>
      <Surface variant="subtle">
        <Skeleton aria-label="Loading card" height={64} />
      </Surface>
      <EmptyState
        title="No goals yet"
        description="Create your first goal to start building a consistent pace."
        action={<Button>Create goal</Button>}
      />
    </div>
  ),
}
