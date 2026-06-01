import { Placeholder, Spinner } from '@telegram-apps/telegram-ui'

export function LoadingState() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '48px 0',
      }}
    >
      <Spinner size="l" />
    </div>
  )
}

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <Placeholder
      header="Что-то пошло не так"
      description={message ?? 'Не удалось загрузить данные'}
      action={
        onRetry ? (
          <button type="button" onClick={onRetry}>
            Повторить
          </button>
        ) : undefined
      }
    />
  )
}

interface EmptyStateProps {
  header: string
  description?: string
}

export function EmptyState({ header, description }: EmptyStateProps) {
  return <Placeholder header={header} description={description} />
}
