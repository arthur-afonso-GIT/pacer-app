import { WifiOff } from 'lucide-react'
import { useSyncExternalStore } from 'react'

const subscribe = (notify: () => void) => {
  window.addEventListener('online', notify)
  window.addEventListener('offline', notify)
  return () => {
    window.removeEventListener('online', notify)
    window.removeEventListener('offline', notify)
  }
}

const onlineSnapshot = () => navigator.onLine
const serverSnapshot = () => true

export function NetworkStatus() {
  const online = useSyncExternalStore(subscribe, onlineSnapshot, serverSnapshot)
  if (online) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="mx-auto flex max-w-5xl items-center justify-center gap-2 border-y border-[var(--ds-color-border)] bg-[var(--ds-color-warning-subtle)] px-5 py-2 text-center text-sm font-bold text-[var(--ds-color-warning)]"
    >
      <WifiOff aria-hidden size={17} />
      Você está offline. Dados já carregados continuam disponíveis, mas novas
      ações precisam de conexão.
    </div>
  )
}
