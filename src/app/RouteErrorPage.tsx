import { AlertTriangle, RotateCcw } from 'lucide-react'
import { isRouteErrorResponse, useRouteError } from 'react-router-dom'
import { Button, Surface } from '@/design-system'

export function ErrorRecoveryView({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <main className="bg-canvas text-primary grid min-h-dvh place-items-center px-5 py-10">
      <Surface variant="raised" className="grid max-w-md gap-4 p-6 text-center">
        <AlertTriangle
          aria-hidden
          className="mx-auto text-[var(--ds-color-warning)]"
          size={38}
        />
        <h1 className="text-2xl font-black">Algo não saiu como esperado</h1>
        <p role="alert" className="text-secondary">
          {message}
        </p>
        <Button type="button" onClick={onRetry}>
          <RotateCcw aria-hidden size={18} /> Tentar novamente
        </Button>
      </Surface>
    </main>
  )
}

export function RouteErrorPage() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? error.status === 404
      ? 'A página que você tentou abrir não foi encontrada.'
      : `Não foi possível abrir esta página (${error.status}).`
    : 'O aplicativo encontrou um erro inesperado. Recarregue para continuar.'
  return (
    <ErrorRecoveryView
      message={message}
      onRetry={() => window.location.reload()}
    />
  )
}
