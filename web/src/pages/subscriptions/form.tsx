import { Input, List, Section, Select } from '@telegram-apps/telegram-ui'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import {
  useCards,
  useCreateSubscription,
  useSubscription,
  useUpdateSubscription,
} from '../../api/hooks.ts'
import type { CreateSubscriptionPayload, IntervalKind } from '../../api/types.ts'
import { useNavBack } from '../../shared/hooks/use-nav-back.ts'
import { LoadingState } from '../../shared/ui/states.tsx'
import { useMainButton } from '../../telegram/hooks.ts'
import { hapticNotify } from '../../telegram/webapp.ts'

const CURRENCIES = ['RUB', 'USD', 'EUR', 'KZT', 'GBP']
const INTERVALS: { value: IntervalKind; label: string }[] = [
  { value: 'month', label: 'Ежемесячно' },
  { value: 'year', label: 'Ежегодно' },
  { value: 'week', label: 'Еженедельно' },
  { value: 'day', label: 'Ежедневно' },
  { value: 'custom', label: 'Свой период (дни)' },
]

interface FormState {
  name: string
  amount: string
  currency: string
  interval: IntervalKind
  intervalDays: string
  nextBillingDate: string
  cardId: string
  notifyDaysBefore: string
}

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm: FormState = {
  name: '',
  amount: '',
  currency: 'RUB',
  interval: 'month',
  intervalDays: '',
  nextBillingDate: today(),
  cardId: '',
  notifyDaysBefore: '3, 1, 0',
}

function parseNotifyDays(raw: string): number[] {
  return raw
    .split(',')
    .map(part => Number(part.trim()))
    .filter(n => Number.isInteger(n) && n >= 0)
}

function buildPayload(form: FormState): CreateSubscriptionPayload {
  return {
    name: form.name.trim(),
    amount: Number(form.amount),
    currency: form.currency,
    interval: form.interval,
    intervalDays:
      form.interval === 'custom' ? Number(form.intervalDays) : null,
    nextBillingDate: form.nextBillingDate,
    notifyDaysBefore: parseNotifyDays(form.notifyDaysBefore),
    cardId: form.cardId || null,
  }
}

export function SubscriptionFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  useNavBack(isEdit ? `/subscriptions/${id}` : '/subscriptions')

  const { data: cards } = useCards()
  const { data: existing, isLoading } = useSubscription(id)
  const createSub = useCreateSubscription()
  const updateSub = useUpdateSubscription(id ?? '')

  const [form, setForm] = useState<FormState>(emptyForm)

  useEffect(() => {
    if (existing) {
      setForm({
        name: existing.name,
        amount: existing.amount,
        currency: existing.currency,
        interval: existing.interval,
        intervalDays: existing.intervalDays?.toString() ?? '',
        nextBillingDate: existing.nextBillingDate,
        cardId: existing.cardId ?? '',
        notifyDaysBefore: existing.notifyDaysBefore.join(', '),
      })
    }
  }, [existing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const isValid = useMemo(() => {
    const amount = Number(form.amount)
    if (!form.name.trim()) return false
    if (!Number.isFinite(amount) || amount <= 0) return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.nextBillingDate)) return false
    if (form.interval === 'custom' && Number(form.intervalDays) <= 0)
      return false
    return true
  }, [form])

  const isPending = createSub.isPending || updateSub.isPending

  const handleSubmit = () => {
    if (!isValid) return
    const payload = buildPayload(form)
    const onSuccess = () => {
      hapticNotify('success')
      navigate('/subscriptions')
    }
    if (isEdit) updateSub.mutate(payload, { onSuccess })
    else createSub.mutate(payload, { onSuccess })
  }

  useMainButton({
    text: isEdit ? 'Сохранить' : 'Добавить',
    onClick: handleSubmit,
    enabled: isValid && !isPending,
    loading: isPending,
  })

  if (isEdit && isLoading) return <LoadingState />

  return (
    <List className="page-bottom-pad">
      <Section header="Подписка">
        <Input
          header="Название"
          placeholder="Например, Netflix"
          value={form.name}
          onChange={e => set('name', e.target.value)}
        />
        <Input
          header="Сумма"
          type="number"
          inputMode="decimal"
          placeholder="0.00"
          value={form.amount}
          onChange={e => set('amount', e.target.value)}
        />
        <Select
          header="Валюта"
          value={form.currency}
          onChange={e => set('currency', e.target.value)}
        >
          {CURRENCIES.map(code => (
            <option key={code} value={code}>
              {code}
            </option>
          ))}
        </Select>
      </Section>

      <Section header="Периодичность">
        <Select
          value={form.interval}
          onChange={e => set('interval', e.target.value as IntervalKind)}
        >
          {INTERVALS.map(item => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </Select>
        {form.interval === 'custom' && (
          <Input
            header="Каждые N дней"
            type="number"
            inputMode="numeric"
            value={form.intervalDays}
            onChange={e => set('intervalDays', e.target.value)}
          />
        )}
        <Input
          header="Следующее списание"
          type="date"
          value={form.nextBillingDate}
          onChange={e => set('nextBillingDate', e.target.value)}
        />
      </Section>

      <Section header="Дополнительно">
        <Select
          header="Карта"
          value={form.cardId}
          onChange={e => set('cardId', e.target.value)}
        >
          <option value="">Без карты</option>
          {cards?.map(card => (
            <option key={card.id} value={card.id}>
              {card.label} •••• {card.last4}
            </option>
          ))}
        </Select>
        <Input
          header="Напоминать за (дни, через запятую)"
          placeholder="3, 1, 0"
          value={form.notifyDaysBefore}
          onChange={e => set('notifyDaysBefore', e.target.value)}
        />
      </Section>
    </List>
  )
}
