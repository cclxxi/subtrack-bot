import { Cell, List, Section } from '@telegram-apps/telegram-ui'
import { useNavigate } from 'react-router-dom'

import { useCards, useDeleteCard } from '../../api/hooks.ts'
import { useNavBack } from '../../shared/hooks/use-nav-back.ts'
import { EmptyState, ErrorState, LoadingState } from '../../shared/ui/states.tsx'
import { haptic, hapticNotify } from '../../telegram/webapp.ts'

export function CardsListPage() {
  const navigate = useNavigate()
  useNavBack('/')

  const { data: cards, isLoading, isError, error, refetch } = useCards()
  const deleteCard = useDeleteCard()

  const remove = (id: string) => {
    haptic('medium')
    deleteCard.mutate(id, { onSuccess: () => hapticNotify('success') })
  }

  if (isLoading) return <LoadingState />
  if (isError) {
    return (
      <ErrorState message={(error as Error).message} onRetry={() => refetch()} />
    )
  }

  return (
    <List>
      <Section>
        <Cell onClick={() => navigate('/cards/new')}>➕ Добавить карту</Cell>
      </Section>

      {cards && cards.length > 0 ? (
        <Section header="Мои карты">
          {cards.map(card => (
            <Cell
              key={card.id}
              subtitle={`•••• ${card.last4}`}
              onClick={() => navigate(`/cards/${card.id}/edit`)}
              after={
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation()
                    remove(card.id)
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 18,
                  }}
                  aria-label="Удалить карту"
                >
                  🗑
                </button>
              }
            >
              {card.label}
            </Cell>
          ))}
        </Section>
      ) : (
        <EmptyState
          header="Карт пока нет"
          description="Добавьте карту, чтобы привязывать к ней подписки"
        />
      )}
    </List>
  )
}
