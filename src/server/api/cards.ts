import { Hono } from 'hono'
import { z } from 'zod'

import type { DrizzleDB } from '../../infra/database/drizzle'
import {
  archiveCard,
  createCard,
  getCardForUser,
  listCardsForUser,
  updateCard,
} from '../../services/cards.ts'
import { fail, ok } from '../response.ts'
import type { AppEnv } from '../types.ts'
import { parseJson } from '../validate.ts'

const labelSchema = z.string().trim().min(1).max(60)
const last4Schema = z.string().regex(/^\d{4}$/, 'last4 must be 4 digits')

const createSchema = z.object({
  label: labelSchema,
  last4: last4Schema,
})

const updateSchema = z
  .object({
    label: labelSchema.optional(),
    last4: last4Schema.optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'No fields to update',
  })

export function cardsRoutes(db: DrizzleDB): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get('/', async c => {
    const user = c.get('user')
    const cards = await listCardsForUser(db, user.id)
    return c.json(ok(cards))
  })

  app.post('/', async c => {
    const user = c.get('user')
    const input = await parseJson(c, createSchema)
    const created = await createCard(db, { ...input, userId: user.id })
    return c.json(ok(created), 201)
  })

  app.get('/:id', async c => {
    const user = c.get('user')
    const card = await getCardForUser(db, user.id, c.req.param('id'))
    if (!card) return c.json(fail('Card not found'), 404)
    return c.json(ok(card))
  })

  app.patch('/:id', async c => {
    const user = c.get('user')
    const patch = await parseJson(c, updateSchema)
    const updated = await updateCard(db, user.id, c.req.param('id'), patch)
    if (!updated) return c.json(fail('Card not found'), 404)
    return c.json(ok(updated))
  })

  app.delete('/:id', async c => {
    const user = c.get('user')
    const archived = await archiveCard(db, user.id, c.req.param('id'))
    if (!archived) return c.json(fail('Card not found'), 404)
    return c.json(ok({ id: c.req.param('id') }))
  })

  return app
}
