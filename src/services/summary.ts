import { and, asc, eq, gte, lte, sql } from 'drizzle-orm'

import type { DrizzleDB } from '../infra/database/drizzle'
import {
  type Subscription,
  subscriptions,
} from '../infra/database/drizzle/schema'
import type { IntervalKind } from '../lib/billing.ts'

export type CurrencyTotal = { currency: string; monthly: number }

const DAYS_IN_MONTH = 30

function monthlyAmount(sub: Subscription): number {
  const amount = Number(sub.amount)
  switch (sub.interval as IntervalKind) {
    case 'day':
      return amount * DAYS_IN_MONTH
    case 'week':
      return amount * (DAYS_IN_MONTH / 7)
    case 'month':
      return amount
    case 'year':
      return amount / 12
    case 'custom':
      if (!sub.intervalDays || sub.intervalDays <= 0) return 0
      return amount * (DAYS_IN_MONTH / sub.intervalDays)
  }
}

export type Summary = {
  totalsByCurrency: CurrencyTotal[]
  activeCount: number
  upcoming: Pick<
    Subscription,
    'id' | 'name' | 'amount' | 'currency' | 'nextBillingDate'
  >[]
}

export async function buildMonthlySummary(
  db: DrizzleDB,
  userId: string,
): Promise<Summary> {
  const all = await db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.isActive, true),
    ),
  })

  const totals = new Map<string, number>()
  for (const s of all) {
    totals.set(s.currency, (totals.get(s.currency) ?? 0) + monthlyAmount(s))
  }
  const totalsByCurrency = [...totals.entries()]
    .map(([currency, monthly]) => ({ currency, monthly }))
    .sort((a, b) => b.monthly - a.monthly)

  const upcoming = await db
    .select({
      id: subscriptions.id,
      name: subscriptions.name,
      amount: subscriptions.amount,
      currency: subscriptions.currency,
      nextBillingDate: subscriptions.nextBillingDate,
    })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.isActive, true),
        gte(subscriptions.nextBillingDate, sql`CURRENT_DATE`),
        lte(
          subscriptions.nextBillingDate,
          sql`CURRENT_DATE + INTERVAL '30 days'`,
        ),
      ),
    )
    .orderBy(asc(subscriptions.nextBillingDate))
    .limit(20)

  return {
    totalsByCurrency,
    activeCount: all.length,
    upcoming,
  }
}
