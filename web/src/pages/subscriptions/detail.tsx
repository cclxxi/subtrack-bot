import { Button, Cell, List, Section } from '@telegram-apps/telegram-ui'
import { useNavigate, useParams } from 'react-router-dom'

import {
  useCards,
  useDeleteSubscription,
  useSubscription,
} from '../../api/hooks.ts'
import {
  formatDate,
  formatMoney,
  humanInterval,
  relativeDueLabel,
} from '../../shared/format.ts'
import { useNavBack } from '../../shared/hooks/use-nav-back.ts'
import { ErrorState, LoadingState } from '../../shared/ui/states.tsx'
import { haptic, hapticNotify } from '../../telegram/webapp.ts'

export function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  useNavBack('/subscriptions')

  const { data: sub, isLoading, isError, error, refetch } = useSubscription(id)
  const { data: cards } = useCards()
  const deleteSub = useDeleteSubscription()

  if (isLoading) return <LoadingState />
  if (isError || !sub) {
    return (
      <ErrorState
        message={(error as Error)?.message ?? 'Подписка не найдена'}
        onRetry={() => refetch()}
      />
    )
  }

  const card = cards?.find(c => c.id === sub.cardId)

  const handleDelete = () => {
    if (!id) return
    haptic('medium')
    deleteSub.mutate(id, {
      onSuccess: () => {
        hapticNotify('success')
        navigate('/subscriptions')
      },
    })
  }

  return (
    <List>
      <Section header={sub.name}>
        <Cell after={formatMoney(sub.amount, sub.currency)}>Сумма</Cell>
        <Cell after={humanInterval(sub.interval, sub.intervalDays)}>
          Периодичность
        </Cell>
        <Cell
          subtitle={relativeDueLabel(sub.nextBillingDate)}
          after={formatDate(sub.nextBillingDate)}
        >
          Следующее списание
        </Cell>
        {card && <Cell after={`•••• ${card.last4}`}>{card.label}</Cell>}
        <Cell after={sub.notifyDaysBefore.join(', ') || '—'}>
          Напоминать за (дн.)
        </Cell>
      </Section>

      <Section>
        <Cell onClick={() => navigate(`/subscriptions/${sub.id}/edit`)}>
          ✏️ Редактировать
        </Cell>
      </Section>

      <Section>
        <div style={{ padding: 16 }}>
          <Button
            mode="outline"
            size="l"
            stretched
            loading={deleteSub.isPending}
            onClick={handleDelete}
          >
            Удалить подписку
          </Button>
        </div>
      </Section>
    </List>
  )
}
