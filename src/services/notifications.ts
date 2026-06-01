import { sql } from 'drizzle-orm'

import type { DrizzleDB } from '../infra/database/drizzle'

export type NotificationKind = 'reminder' | 'charge'

export type NotifierCandidate = {
  subscriptionId: string
  telegramId: number
  name: string
  amount: string
  currency: string
  nextBillingDate: string
  daysBefore: number
  kind: NotificationKind
}

/**
 * Finds all subscriptions that should trigger a notification right now:
 * - subscription is active
 * - current local hour in user's timezone matches user.notification_hour
 * - days-until-next-billing is in subscription.notify_days_before
 */
export async function findNotifierCandidates(
  db: DrizzleDB,
): Promise<NotifierCandidate[]> {
  const result = await db.execute(sql`
    SELECT
      s.id                                                       AS "subscriptionId",
      u.telegram_id                                              AS "telegramId",
      s.name                                                     AS "name",
      s.amount                                                   AS "amount",
      s.currency                                                 AS "currency",
      to_char(s.next_billing_date, 'YYYY-MM-DD')                 AS "nextBillingDate",
      (s.next_billing_date - CURRENT_DATE)::int                  AS "daysBefore",
      CASE WHEN (s.next_billing_date - CURRENT_DATE) = 0
           THEN 'charge' ELSE 'reminder' END                     AS "kind"
    FROM subscriptions s
    JOIN users u ON u.id = s.user_id
    WHERE s.is_active
      AND EXTRACT(HOUR FROM (NOW() AT TIME ZONE u.timezone)) = u.notification_hour
      AND (s.next_billing_date - CURRENT_DATE) = ANY(s.notify_days_before)
  `)
  return result.rows as NotifierCandidate[]
}

/**
 * Tries to record a notification. Returns true if it was inserted (i.e. this is
 * the first attempt today for this sub/kind/daysBefore combo), false if it was
 * already there (deduped).
 */
export async function recordNotification(
  db: DrizzleDB,
  subscriptionId: string,
  kind: NotificationKind,
  daysBefore: number,
): Promise<boolean> {
  const result = await db.execute(sql`
    INSERT INTO notifications_log (subscription_id, kind, days_before)
    VALUES (${subscriptionId}, ${kind}, ${daysBefore})
    ON CONFLICT (subscription_id, sent_on, kind, days_before) DO NOTHING
    RETURNING id
  `)
  return (result.rowCount ?? 0) > 0
}
