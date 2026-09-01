import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ChallengeHomePage } from './ChallengeHomePage'

describe('ChallengeHomePage', () => {
  it('exposes the complete challenge journey', async () => {
    const onNavigate = vi.fn()
    render(
      <ChallengeHomePage
        name="Movimento diário"
        habitCount={2}
        onNavigate={onNavigate}
      />,
    )

    for (const label of [
      'Publicar atividade com foto',
      'Registrar hábito do desafio',
      'Revisar atividades',
      'Ver ranking',
    ]) {
      expect(screen.getByRole('button', { name: label })).toBeVisible()
    }
    expect(
      screen.queryByRole('button', { name: 'Adicionar hábito' }),
    ).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Ver ranking' }))
    expect(onNavigate).toHaveBeenCalledWith('ranking')
  })

  it('publishes a draft only after it has a habit', async () => {
    const publish = vi.fn()
    const { rerender } = render(
      <ChallengeHomePage
        name="Rascunho"
        habitCount={0}
        status="draft"
        canManage
        onPublish={publish}
        onNavigate={vi.fn()}
      />,
    )
    expect(
      screen.getByRole('button', { name: 'Publicar desafio' }),
    ).toBeDisabled()
    rerender(
      <ChallengeHomePage
        name="Rascunho"
        habitCount={1}
        status="draft"
        canManage
        onPublish={publish}
        onNavigate={vi.fn()}
      />,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Publicar desafio' }),
    )
    expect(publish).toHaveBeenCalledOnce()
  })

  it('shows frozen rules and hides configuration actions after publication', () => {
    render(
      <ChallengeHomePage
        name="Movimento diário"
        description="Mexa o corpo todos os dias."
        habitCount={1}
        habits={[
          {
            id: 'habit-1',
            name: 'Caminhar',
            points: 10,
            maxSubmissionsPerDay: 2,
          },
        ]}
        startsAt="2026-08-29T12:00:00Z"
        endsAt="2026-09-29T12:00:00Z"
        timezone="America/Fortaleza"
        reviewPolicy="admins_only"
        status="active"
        canManage
        onNavigate={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('heading', { name: 'Regras do desafio' }),
    ).toBeVisible()
    expect(screen.getByText('Revisão por administradores')).toBeVisible()
    expect(screen.getByText('10 pts · 2/dia')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Adicionar hábito' }),
    ).toBeNull()
  })

  it('only keeps ranking available for a completed challenge', () => {
    render(
      <ChallengeHomePage
        name="Concluído"
        habitCount={1}
        status="completed"
        canManage
        onNavigate={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Ver ranking' })).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Registrar atividade' }),
    ).toBeNull()
    expect(
      screen.queryByRole('button', { name: 'Adicionar hábito' }),
    ).toBeNull()
  })

  it('does not offer activity actions before the challenge starts', () => {
    render(
      <ChallengeHomePage
        name="Próximo desafio"
        habitCount={1}
        status="scheduled"
        onNavigate={vi.fn()}
      />,
    )
    expect(screen.getByText('Desafio agendado')).toBeVisible()
    expect(screen.queryByRole('button')).toBeNull()
  })
})
