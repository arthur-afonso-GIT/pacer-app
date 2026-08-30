import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { describe, it, expect, vi } from 'vitest'
import { AuthContext } from './auth-context'
import { ForgotPasswordPage, ResetPasswordPage } from './PasswordRecovery'
import { requestPasswordReset, updatePassword } from './api'

describe('password recovery', () => {
  it('validates email, normalizes it and shows a neutral confirmation', async () => {
    const requestReset = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <ForgotPasswordPage requestReset={requestReset} />
      </MemoryRouter>,
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Enviar link de recuperação' }),
    )
    expect(requestReset).not.toHaveBeenCalled()
    await userEvent.type(
      screen.getByLabelText('E-mail'),
      ' Pessoa@Exemplo.com ',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Enviar link de recuperação' }),
    )
    expect(requestReset).toHaveBeenCalledWith('pessoa@exemplo.com')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Se houver uma conta',
    )
  })

  it('shows email rate limits without claiming an email was sent', async () => {
    render(
      <MemoryRouter>
        <ForgotPasswordPage
          requestReset={vi
            .fn()
            .mockRejectedValue({ code: 'over_email_send_rate_limit' })}
        />
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com')
    await userEvent.click(
      screen.getByRole('button', { name: 'Enviar link de recuperação' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'limite de envio',
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  function resetPage(
    session: Session | null,
    savePassword = vi.fn(),
    path = '/redefinir-senha',
    loading = false,
  ) {
    return render(
      <AuthContext.Provider
        value={{
          session,
          user: session?.user ?? null,
          loading,
          signOut: vi.fn(),
        }}
      >
        <MemoryRouter initialEntries={[path]}>
          <ResetPasswordPage savePassword={savePassword} />
        </MemoryRouter>
      </AuthContext.Provider>,
    )
  }
  const session = { user: { id: 'test-user' } } as Session

  it('does not allow password updates without a session', () => {
    resetPage(null)
    expect(screen.getByRole('alert')).toHaveTextContent('link é inválido')
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })
  it('waits for authentication initialization', () => {
    resetPage(null, vi.fn(), '/redefinir-senha', true)
    expect(screen.getByRole('status')).toHaveTextContent('Verificando link')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
  it('rejects expired links even with an existing session', () => {
    resetPage(
      session,
      vi.fn(),
      '/redefinir-senha#error=access_denied&error_code=otp_expired',
    )
    expect(screen.getByRole('alert')).toHaveTextContent('expirou')
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })
  it('requires matching passwords, supports visibility and saves only the new password', async () => {
    const save = vi.fn().mockResolvedValue(undefined)
    resetPage(session, save)
    await userEvent.type(screen.getByLabelText('Nova senha'), 'novasenha123')
    await userEvent.type(
      screen.getByLabelText('Confirmar nova senha'),
      'diferente123',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar nova senha' }),
    )
    expect(
      await screen.findByText('As senhas precisam ser iguais.'),
    ).toBeVisible()
    expect(save).not.toHaveBeenCalled()
    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar nova senha' }),
    )
    expect(screen.getByLabelText('Nova senha')).toHaveAttribute('type', 'text')
    expect(screen.getByLabelText('Confirmar nova senha')).toHaveAttribute(
      'type',
      'password',
    )
    await userEvent.clear(screen.getByLabelText('Confirmar nova senha'))
    await userEvent.type(
      screen.getByLabelText('Confirmar nova senha'),
      'novasenha123',
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Salvar nova senha' }),
    )
    await waitFor(() => expect(save).toHaveBeenCalledWith('novasenha123'))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Senha atualizada',
    )
    expect(screen.queryByLabelText('Nova senha')).not.toBeInTheDocument()
  })
  it('uses the current origin for the recovery callback and propagates update errors', async () => {
    const fake = {
      auth: {
        resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
        updateUser: vi
          .fn()
          .mockResolvedValue({ error: { code: 'same_password' } }),
      },
    }
    await requestPasswordReset('test@example.com', fake as never)
    expect(fake.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      { redirectTo: `${window.location.origin}/redefinir-senha` },
    )
    await expect(updatePassword('novasenha123', fake as never)).rejects.toEqual(
      { code: 'same_password' },
    )
    expect(fake.auth.updateUser).toHaveBeenCalledWith({
      password: 'novasenha123',
    })
  })
})
