import { Hono } from 'hono'
import { z } from 'zod'

import type { DrizzleDB } from '../../infra/database/drizzle'
import {
  createSubscription,
  deactivateSubscription,
  getSubscriptionForUser,
  listSubscriptionsForUser,
  updateSubscription,
} from '../../services/subscriptions.ts'
import { fail, ok } from '../response.ts'
import type { AppEnv } from '../types.ts'
import { parseJson } from '../validate.ts'

const intervalSchema = z.enum(['day', 'week', 'month', 'year', 'custom'])

const amountSchema = z
  .number()
  .positive()
  .finite()
  .transform(n => n.toFixed(2))

const currencySchema = z
  .string()
  .regex(/^[A-Za-z]{3}$/, 'currency must be a 3-letter code')
  .transform(s => s.toUpperCase())

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')

const notifyDaysSchema = z.array(z.number().int().min(0).max(365)).max(10)

const createSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    amount: amountSchema,
    currency: currencySchema,
    interval: intervalSchema,
    intervalDays: z.number().int().positive().max(3650).nullable().optional(),
    nextBillingDate: dateSchema,
    notifyDaysBefore: notifyDaysSchema.optional(),
    cardId: z.uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.interval === 'custom' && !data.intervalDays) {
      ctx.addIssue({
        code: 'custom',
        path: ['intervalDays'],
        message: 'intervalDays is required for a custom interval',
      })
    }
  })

const updateSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    amount: amountSchema.optional(),
    currency: currencySchema.optional(),
    interval: intervalSchema.optional(),
    intervalDays: z.number().int().positive().max(3650).nullable().optional(),
    nextBillingDate: dateSchema.optional(),
    notifyDaysBefore: notifyDaysSchema.optional(),
    cardId: z.uuid().nullable().optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'No fields to update',
  })

export function subscriptionsRoutes(db: DrizzleDB): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get('/', async c => {
    const user = c.get('user')
    const subs = await listSubscriptionsForUser(db, user.id)
    return c.json(ok(subs))
  })

  app.post('/', async c => {
    const user = c.get('user')
    const input = await parseJson(c, createSchema)
    const created = await createSubscription(db, { ...input, userId: user.id })
    return c.json(ok(created), 201)
  })

  app.get('/:id', async c => {
    const user = c.get('user')
    const sub = await getSubscriptionForUser(db, user.id, c.req.param('id'))
    if (!sub) return c.json(fail('Subscription not found'), 404)
    return c.json(ok(sub))
  })

  app.patch('/:id', async c => {
    const user = c.get('user')
    const patch = await parseJson(c, updateSchema)
    const updated = await updateSubscription(
      db,
      user.id,
      c.req.param('id'),
      patch,
    )
    if (!updated) return c.json(fail('Subscription not found'), 404)
    return c.json(ok(updated))
  })

  app.delete('/:id', async c => {
    const user = c.get('user')
    const removed = await deactivateSubscription(db, user.id, c.req.param('id'))
    if (!removed) return c.json(fail('Subscription not found'), 404)
    return c.json(ok({ id: c.req.param('id') }))
  })

  return app
}
