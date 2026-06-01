import type { IntervalKind } from '../api/types.ts'

const CURRENCY_LOCALE = 'ru-RU'

/** Format an amount string/number with its currency, falling back gracefully. */
export function formatMoney(amount: string | number, currency: string): string {
  const value = typeof amount === 'string' ? Number(amount) : amount
  if (!Number.isFinite(value)) return `${amount} ${currency}`

  try {
    return new Intl.NumberFormat(CURRENCY_LOCALE, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    // Unknown/non-ISO currency code — render plainly.
    return `${value.toFixed(2)} ${currency}`
  }
}

export function humanInterval(
  interval: IntervalKind,
  intervalDays: number | null,
): string {
  switch (interval) {
    case 'day':
      return 'каждый день'
    case 'week':
      return 'еженедельно'
    case 'month':
      return 'ежемесячно'
    case 'year':
      return 'ежегодно'
    case 'custom':
      return intervalDays ? `раз в ${intervalDays} дн.` : 'нестандартный'
  }
}

const dateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
})

export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return dateFormatter.format(new Date(Date.UTC(y, m - 1, d)))
}

/** Whole days from today (UTC) until the given YYYY-MM-DD date. */
export function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return 0
  const target = Date.UTC(y, m - 1, d)
  const now = new Date()
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.round((target - today) / 86_400_000)
}

export function relativeDueLabel(isoDate: string): string {
  const days = daysUntil(isoDate)
  if (days < 0) return 'просрочено'
  if (days === 0) return 'сегодня'
  if (days === 1) return 'завтра'
  return `через ${days} дн.`
}
