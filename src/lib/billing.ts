export type IntervalKind = 'day' | 'week' | 'month' | 'year' | 'custom'

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

export function nextBillingDate(
  interval: IntervalKind,
  anchor: string,
  intervalDays: number | null = null,
): string {
  const [y, m, d] = parseISODate(anchor)

  switch (interval) {
    case 'day':
      return formatISODate(addDays(y, m, d, 1))
    case 'week':
      return formatISODate(addDays(y, m, d, 7))
    case 'month':
      return formatISODate(addMonths(y, m, d, 1))
    case 'year':
      return formatISODate(addMonths(y, m, d, 12))
    case 'custom': {
      if (!intervalDays || intervalDays <= 0) {
        throw new Error('intervalDays required for custom interval')
      }
      return formatISODate(addDays(y, m, d, intervalDays))
    }
  }
}

type YMD = { y: number; m: number; d: number }

function parseISODate(s: string): [number, number, number] {
  const match = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) throw new Error(`invalid date string: ${s}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function formatISODate({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function addDays(y: number, m: number, d: number, days: number): YMD {
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return {
    y: dt.getUTCFullYear(),
    m: dt.getUTCMonth() + 1,
    d: dt.getUTCDate(),
  }
}

function addMonths(y: number, m: number, d: number, months: number): YMD {
  // Determine target year/month, then clamp day to last day of target month
  // (so Jan 31 + 1 month → Feb 28/29, not March 3)
  const total = m - 1 + months
  const targetYear = y + Math.floor(total / 12)
  const targetMonth = (((total % 12) + 12) % 12) + 1
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate()
  return { y: targetYear, m: targetMonth, d: Math.min(d, lastDay) }
}
