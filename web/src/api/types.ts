// Shapes mirror the backend (src/server/response.ts + service return types).
// Kept hand-written and minimal — only the fields the UI consumes.

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string }

export type IntervalKind = 'day' | 'week' | 'month' | 'year' | 'custom'

export interface Subscription {
  id: string
  name: string
  amount: string
  currency: string
  interval: IntervalKind
  intervalDays: number | null
  nextBillingDate: string
  notifyDaysBefore: number[]
  cardId: string | null
  isActive: boolean
}

export interface Card {
  id: string
  label: string
  last4: string
  isArchived: boolean
}

export interface CurrencyTotal {
  currency: string
  monthly: number
}

export interface Summary {
  totalsByCurrency: CurrencyTotal[]
  activeCount: number
  upcoming: Pick<
    Subscription,
    'id' | 'name' | 'amount' | 'currency' | 'nextBillingDate'
  >[]
}

export interface Profile {
  id: string
  firstName: string | null
  username: string | null
  timezone: string
  notificationHour: number
  locale: string
}

export interface CreateSubscriptionPayload {
  name: string
  amount: number
  currency: string
  interval: IntervalKind
  intervalDays?: number | null
  nextBillingDate: string
  notifyDaysBefore?: number[]
  cardId?: string | null
}

export type UpdateSubscriptionPayload = Partial<CreateSubscriptionPayload>

export interface CardPayload {
  label: string
  last4: string
}
