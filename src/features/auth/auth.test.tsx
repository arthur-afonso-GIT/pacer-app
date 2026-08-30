import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Session } from '@supabase/supabase-js'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { useAuth } from './auth-context'
import { ProtectedRoute } from './ProtectedRoute'
import { AuthPage } from './AuthPage'
import { authSchema } from './schemas'
import { authErrorMessage } from './errors'

const noSession = { data: { session: null }, error: null }

function client(session: Session | null = null) {
  const unsubscribe = vi.fn()
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
      onAuthStateChange: vi
        .fn()
        .mockReturnValue({ data: { subscription: { unsubscribe } } }),
      signInWithPassword: vi.fn().mockResolvedValue(noSession),
      signUp: vi.fn().mockResolvedValue(noSession),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  }
}

describe('authSchema', () => {
  it('rejects an invalid email and short password', () => {
    const result = authSchema.safeParse({ email: 'invalido', password: '123' })
    expect(result.success).toBe(false)
  })
})

describe('AuthProvider', () => {
  it('loads the session and unsubscribes from auth changes', async () => {
    const fake = client()
    function Consumer() {
      const { loading, user } = useAuth()
      return (
        <span>{loading ? 'carregando' : (user?.email ?? 'visitante')}</span>
      )
    }
    const view = render(
      <AuthProvider client={fake as never}>
        <Consumer />
      </AuthProvider>,
    )
    await screen.findByText('visitante')
    view.unmount()
    expect(fake.auth.onAuthStateChange).toHaveBeenCalledOnce()
  })

  it('redirects unauthenticated visitors and preserves their destination', async () => {
    const fake = client()
    render(
      <AuthProvider client={fake as never}>
        <MemoryRouter initialEntries={['/privado']}>
          <Routes>
            <Route path="/entrar" element={<span>Entrar</span>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/privado" element={<span>Privado</span>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    )
    expect(await screen.findByText('Entrar')).toBeInTheDocument()
  })
})

describe('AuthPage', () => {
  it('requires matching passwords only on signup and never sends confirmation to the API', async () => {
    const signUp = vi.fn().mockResolvedValue({ session: null })
    render(
      <MemoryRouter>
        <AuthPage signIn={vi.fn()} signUp={signUp} />
      </MemoryRouter>,
    )
    expect(screen.queryByLabelText('Confirmar senha')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Quero começar' }))
    expect(
      screen.getByRole('heading', { name: 'Crie sua conta' }),
    ).toBeVisible()
    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123')
    await userEvent.type(
      screen.getByLabelText('Confirmar senha'),
      'diferente123',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(
      await screen.findByText('As senhas precisam ser iguais.'),
    ).toBeVisible()
    expect(signUp).not.toHaveBeenCalled()
    await userEvent.clear(screen.getByLabelText('Confirmar senha'))
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({
        email: 'pessoa@exemplo.com',
        password: 'segredo123',
      }),
    )
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Verifique seu e-mail',
    )
  })

  it('toggles password visibility independently and clears secrets when switching modes', async () => {
    render(
      <MemoryRouter>
        <AuthPage signIn={vi.fn()} signUp={vi.fn()} />
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'text')
    await userEvent.click(screen.getByRole('button', { name: 'Quero começar' }))
    expect(screen.getByLabelText('Senha')).toHaveValue('')
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
    await userEvent.click(
      screen.getByRole('button', { name: 'Mostrar confirmação de senha' }),
    )
    expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute(
      'type',
      'text',
    )
    expect(screen.getByLabelText('Senha')).toHaveAttribute('type', 'password')
    await userEvent.click(
      screen.getByRole('button', { name: 'Ocultar confirmação de senha' }),
    )
    expect(screen.getByLabelText('Confirmar senha')).toHaveAttribute(
      'type',
      'password',
    )
  })

  it('explains a Supabase email delivery failure', async () => {
    const signUp = vi
      .fn()
      .mockRejectedValue({
        code: 'over_email_send_rate_limit',
        message: 'email rate limit exceeded',
      })
    render(
      <MemoryRouter>
        <AuthPage signIn={vi.fn()} signUp={signUp} />
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Quero começar' }))
    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123')
    await userEvent.type(screen.getByLabelText('Confirmar senha'), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'limite de envio de e-mails',
    )
  })

  it('maps backend error codes without requiring an Error instance', () => {
    expect(
      authErrorMessage({ code: 'email_address_not_authorized' }),
    ).toContain('SMTP')
    expect(authErrorMessage({ code: 'signup_disabled' })).toContain(
      'desativado',
    )
    expect(
      authErrorMessage(new Error('Database error saving new user')),
    ).toContain('banco recusou')
  })
  it('redirects to the requested page after a successful sign in', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter
        initialEntries={[
          { pathname: '/entrar', state: { from: { pathname: '/grupo' } } },
        ]}
      >
        <Routes>
          <Route
            path="/entrar"
            element={<AuthPage signIn={signIn} signUp={vi.fn()} />}
          />
          <Route path="/grupo" element={<h1>Meus grupos</h1>} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.type(screen.getByLabelText('E-mail'), 'pessoa@exemplo.com')
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(
      await screen.findByRole('heading', { name: 'Meus grupos' }),
    ).toBeVisible()
  })

  it('submits normalized credentials through the feature boundary', async () => {
    const signIn = vi.fn().mockResolvedValue(undefined)
    render(
      <MemoryRouter>
        <AuthPage signIn={signIn} signUp={vi.fn()} />
      </MemoryRouter>,
    )
    await userEvent.type(
      screen.getByLabelText('E-mail'),
      ' Pessoa@Exemplo.com ',
    )
    await userEvent.type(screen.getByLabelText('Senha'), 'segredo123')
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith({
        email: 'pessoa@exemplo.com',
        password: 'segredo123',
      }),
    )
  })
})
