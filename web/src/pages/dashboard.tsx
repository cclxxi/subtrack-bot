import { Cell, List, Section, Title } from '@telegram-apps/telegram-ui'
import { useNavigate } from 'react-router-dom'

import { useSummary } from '../api/hooks.ts'
import { formatMoney, relativeDueLabel } from '../shared/format.ts'
import { ErrorState, LoadingState } from '../shared/ui/states.tsx'
import { haptic } from '../telegram/webapp.ts'

const Chevron = () => <span aria-hidden="true" style={{ opacity: 0.3 }}>›</span>

export function DashboardPage() {
  const navigate = useNavigate()
  const { data: summary, isLoading, isError, error, refetch } = useSummary()

  const go = (path: string) => {
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
    <List>
      <Section header="В этом месяце">
        {summary && summary.totalsByCurrency.length > 0 ? (
          summary.totalsByCurrency.map(total => (
            <Cell
              key={total.currency}
              subtitle={`${summary.activeCount} активных подписок`}
            >
              <Title level="2" weight="1">
                {formatMoney(total.monthly, total.currency)}
              </Title>
            </Cell>
          ))
        ) : (
          <Cell subtitle="Добавьте первую подписку">Пока пусто</Cell>
        )}
      </Section>

      <Section header="Разделы">
        <Cell onClick={() => go('/subscriptions')} after={<Chevron />}>
          📋 Подписки
        </Cell>
        <Cell onClick={() => go('/cards')} after={<Chevron />}>
          💳 Карты
        </Cell>
        <Cell onClick={() => go('/settings')} after={<Chevron />}>
          ⚙️ Настройки
        </Cell>
      </Section>

      {summary && summary.upcoming.length > 0 && (
        <Section header="Ближайшие списания">
          {summary.upcoming.map(item => (
            <Cell
              key={item.id}
              subtitle={relativeDueLabel(item.nextBillingDate)}
              after={formatMoney(item.amount, item.currency)}
              onClick={() => go(`/subscriptions/${item.id}`)}
            >
              {item.name}
            </Cell>
          ))}
        </Section>
      )}
    </List>
  )
}
