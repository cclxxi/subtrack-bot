import { sql } from 'drizzle-orm'
import {
  boolean,
  char,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

import { cards } from './card.schema.ts'
import { users } from './user.schema.ts'

export const subscriptionInterval = pgEnum('subscription_interval', [
  'day',
  'week',
  'month',
  'year',
  'custom',
])

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  currency: char('currency', { length: 3 }).notNull(),
  interval: subscriptionInterval('interval').notNull(),
  intervalDays: integer('interval_days'),
  nextBillingDate: date('next_billing_date', { mode: 'string' }).notNull(),
  notifyDaysBefore: integer('notify_days_before')
    .array()
    .notNull()
    .default(sql`'{3,1,0}'::int[]`),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
