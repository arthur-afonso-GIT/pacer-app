import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
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

describe('design-system primitives', () => {
  it('exposes accessible button states', () => {
    render(<Button loading>Save</Button>)
    expect(
      (screen.getByRole('button', { name: 'Save' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(screen.getByRole('button').getAttribute('aria-busy')).toBe('true')
  })

  it('requires an accessible name for icon buttons', () => {
    render(<IconButton aria-label="Open menu">☰</IconButton>)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy()
  })

  it('connects input and textarea errors to their fields', () => {
    render(
      <>
        <Input label="Email" error="Invalid email" />
        <Textarea label="Notes" error="Required" />
      </>,
    )
    expect(screen.getByLabelText('Email').getAttribute('aria-invalid')).toBe(
      'true',
    )
    expect(screen.getByText('Invalid email').getAttribute('role')).toBe('alert')
    expect(screen.getByLabelText('Notes').getAttribute('aria-invalid')).toBe(
      'true',
    )
  })

  it('renders avatar fallback and semantic indicators', async () => {
    render(
      <>
        <Avatar fallback="AR" />
        <Badge tone="success">Done</Badge>
        <PointBadge points={12} />
        <StreakIndicator days={4} />
      </>,
    )
    expect(await screen.findByText('AR')).toBeTruthy()
    expect(screen.getByText('+12 pts')).toBeTruthy()
    expect(screen.getByLabelText('Sequência de 4 dias')).toBeTruthy()
  })

  it('renders structural primitives with useful semantics', () => {
    render(
      <>
        <Surface as="section">Panel</Surface>
        <Skeleton aria-label="Loading item" />
        <EmptyState title="Nothing here" action={<Button>Add</Button>} />
      </>,
    )
    expect(screen.getByText('Panel').tagName).toBe('SECTION')
    expect(
      screen.getByLabelText('Loading item').getAttribute('aria-busy'),
    ).toBe('true')
    expect(screen.getByRole('heading', { name: 'Nothing here' })).toBeTruthy()
  })
})
