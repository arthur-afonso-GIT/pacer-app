import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext } from '@/features/auth/auth-context'
import { AppShell } from './AppShell'
import { applyThemePreference } from './theme'

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  Outlet: () => <div>conteúdo</div>,
}))

describe('AppShell', () => {
  it('applies and removes the constrained dark theme', () => {
    applyThemePreference('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
    applyThemePreference('light')
    expect(document.documentElement.dataset.theme).toBeUndefined()
  })

  it('exposes all five primary destinations', () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={new QueryClient()}>
          <AuthContext.Provider
            value={{
              session: null,
              user: null,
              loading: false,
              signOut: vi.fn(),
            }}
          >
            <AppShell />
          </AuthContext.Provider>
        </QueryClientProvider>
      </MemoryRouter>,
    )
    for (const name of ['Hoje', 'Grupo', 'Ranking', 'Calendário', 'Perfil'])
      expect(screen.getByRole('link', { name })).toBeVisible()
    expect(screen.queryByText(/7 dias/)).not.toBeInTheDocument()
  })
})
