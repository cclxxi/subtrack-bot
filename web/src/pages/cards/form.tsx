import { Input, List, Section } from '@telegram-apps/telegram-ui'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { useCards, useCreateCard, useUpdateCard } from '../../api/hooks.ts'
import { useNavBack } from '../../shared/hooks/use-nav-back.ts'
import { useMainButton } from '../../telegram/hooks.ts'
import { hapticNotify } from '../../telegram/webapp.ts'

export function CardFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  useNavBack('/cards')

  const { data: cards } = useCards()
  const existing = cards?.find(c => c.id === id)
  const createCard = useCreateCard()
  const updateCard = useUpdateCard(id ?? '')

  const [label, setLabel] = useState('')
  const [last4, setLast4] = useState('')

  useEffect(() => {
    if (existing) {
      setLabel(existing.label)
      setLast4(existing.last4)
    }
  }, [existing])

  const isValid = useMemo(
    () => label.trim().length > 0 && /^\d{4}$/.test(last4),
    [label, last4],
  )

  const isPending = createCard.isPending || updateCard.isPending

  const handleSubmit = () => {
    if (!isValid) return
    const payload = { label: label.trim(), last4 }
    const onSuccess = () => {
      hapticNotify('success')
      navigate('/cards')
    }
    if (isEdit) updateCard.mutate(payload, { onSuccess })
    else createCard.mutate(payload, { onSuccess })
  }

  useMainButton({
    text: isEdit ? 'Сохранить' : 'Добавить',
    onClick: handleSubmit,
    enabled: isValid && !isPending,
    loading: isPending,
  })

  return (
    <List className="page-bottom-pad">
      <Section header="Карта">
        <Input
          header="Название"
          placeholder="Например, Тинькофф"
          value={label}
          onChange={e => setLabel(e.target.value)}
        />
        <Input
          header="Последние 4 цифры"
          type="text"
          inputMode="numeric"
          maxLength={4}
          placeholder="1234"
          value={last4}
          onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))}
        />
      </Section>
    </List>
  )
}
