import { Cell, List, Section } from '@telegram-apps/telegram-ui'
import { useNavigate } from 'react-router-dom'

import { useSubscriptions } from '../../api/hooks.ts'
import {
  formatMoney,
  humanInterval,
  relativeDueLabel,
} from '../../shared/format.ts'
import { useNavBack } from '../../shared/hooks/use-nav-back.ts'
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states.tsx'
import { haptic } from '../../telegram/webapp.ts'

export function SubscriptionsListPage() {
  const navigate = useNavigate()
  useNavBack('/')

  const { data: subs, isLoading, isError, error, refetch } = useSubscriptions()

  const open = (path: string) => {
    haptic('light')
    navigate(path)
  }

  if (isLoading) return <LoadingState />
  if (isError) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    )
  }

  return (
    <List className="page-bottom-pad">
      <Section>
        <Cell onClick={() => open('/subscriptions/new')}>➕ Добавить подписку</Cell>
      </Section>

      {subs && subs.length > 0 ? (
        <Section header="Активные подписки">
          {subs.map(sub => (
            <Cell
              key={sub.id}
              subtitle={`${humanInterval(sub.interval, sub.intervalDays)} · ${relativeDueLabel(sub.nextBillingDate)}`}
              after={formatMoney(sub.amount, sub.currency)}
              onClick={() => open(`/subscriptions/${sub.id}`)}
            >
              {sub.name}
            </Cell>
          ))}
        </Section>
      ) : (
        <EmptyState
          header="Подписок пока нет"
          description="Добавьте первую, чтобы не пропустить списание"
        />
      )}
    </List>
  )
}
