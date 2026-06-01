import { sql } from 'drizzle-orm'
import {
  date,
  integer,
  pgEnum,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

import { subscriptions } from './subscription.schema.ts'

export const notificationKind = pgEnum('notification_kind', [
  'reminder',
  'charge',
])

export const notifications = pgTable(
  'notifications_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
    sentOn: date('sent_on', { mode: 'string' })
      .notNull()
      .default(sql`CURRENT_DATE`),
    kind: notificationKind('kind').notNull(),
    daysBefore: integer('days_before').notNull(),
  },
  t => ({
    dedup: uniqueIndex('notifications_log_dedup_idx').on(
      t.subscriptionId,
      t.sentOn,
      t.kind,
      t.daysBefore,
    ),
  }),
)

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
