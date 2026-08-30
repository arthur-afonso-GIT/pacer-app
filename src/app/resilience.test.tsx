import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { NetworkStatus } from './NetworkStatus'
import { ErrorRecoveryView } from './RouteErrorPage'

describe('application resilience', () => {
  it('announces when the device loses connectivity', () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
    const { unmount } = render(<NetworkStatus />)
    expect(screen.queryByRole('status')).toBeNull()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    })
    void act(() => window.dispatchEvent(new Event('offline')))
    expect(screen.getByRole('status')).toHaveTextContent('Você está offline')
    unmount()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  it('offers recovery after an unexpected route failure', async () => {
    const retry = vi.fn()
    render(<ErrorRecoveryView message="Falha temporária." onRetry={retry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Falha temporária.')
    await userEvent.click(
      screen.getByRole('button', { name: 'Tentar novamente' }),
    )
    expect(retry).toHaveBeenCalledOnce()
  })
})
