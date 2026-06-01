import { and, eq } from 'drizzle-orm'

import type { DrizzleDB } from '../infra/database/drizzle'
import {
  type NewSubscription,
  type Subscription,
  subscriptions,
} from '../infra/database/drizzle/schema'
import { nextBillingDate } from '../lib/billing.ts'

export type CreateSubscriptionInput = Pick<
  NewSubscription,
  | 'userId'
  | 'name'
  | 'amount'
  | 'currency'
  | 'interval'
  | 'intervalDays'
  | 'nextBillingDate'
  | 'cardId'
>

export async function listSubscriptionsForUser(
  db: DrizzleDB,
  userId: string,
): Promise<Subscription[]> {
  return db.query.subscriptions.findMany({
    where: and(
      eq(subscriptions.userId, userId),
      eq(subscriptions.isActive, true),
    ),
    orderBy: (s, { asc }) => [asc(s.nextBillingDate)],
  })
}

export async function createSubscription(
  db: DrizzleDB,
  data: CreateSubscriptionInput,
): Promise<Subscription> {
  const [created] = await db.insert(subscriptions).values(data).returning()
  return created!
}

export async function advanceNextBillingDate(
  db: DrizzleDB,
  subscriptionId: string,
): Promise<string | null> {
  const [sub] = await db
    .select({
      interval: subscriptions.interval,
      intervalDays: subscriptions.intervalDays,
      nextBillingDate: subscriptions.nextBillingDate,
    })
    .from(subscriptions)
    .where(eq(subscriptions.id, subscriptionId))
    .limit(1)
  if (!sub) return null

  const newDate = nextBillingDate(
    sub.interval,
    sub.nextBillingDate,
    sub.intervalDays,
  )
  await db
    .update(subscriptions)
    .set({ nextBillingDate: newDate, updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId))
  return newDate
}

export async function deactivateSubscription(
  db: DrizzleDB,
  userId: string,
  subscriptionId: string,
): Promise<boolean> {
  const res = await db
    .update(subscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(
      and(
        eq(subscriptions.id, subscriptionId),
        eq(subscriptions.userId, userId),
      ),
    )
    .returning({ id: subscriptions.id })
  return res.length > 0
}
