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
