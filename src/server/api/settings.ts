import { Hono } from 'hono'
import { z } from 'zod'

import type { DrizzleDB } from '../../infra/database/drizzle'
import {
  isValidIanaTimezone,
  updateUserSettings,
} from '../../services/users.ts'
import { fail, ok } from '../response.ts'
import type { AppEnv } from '../types.ts'
import { parseJson } from '../validate.ts'

/** Public-facing shape of the current user — never leak internal-only fields. */
function toProfile(user: {
  id: string
  firstName: string | null
  username: string | null
  timezone: string
  notificationHour: number
  locale: string
}) {
  return {
    id: user.id,
    firstName: user.firstName,
    username: user.username,
    timezone: user.timezone,
    notificationHour: user.notificationHour,
    locale: user.locale,
  }
}

const updateSchema = z
  .object({
    timezone: z
      .string()
      .trim()
      .min(1)
      .refine(isValidIanaTimezone, 'Unknown IANA timezone')
      .optional(),
    notificationHour: z.number().int().min(0).max(23).optional(),
  })
  .refine(data => Object.keys(data).length > 0, {
    message: 'No fields to update',
  })

export function settingsRoutes(db: DrizzleDB): Hono<AppEnv> {
  const app = new Hono<AppEnv>()

  app.get('/me', c => {
    return c.json(ok(toProfile(c.get('user'))))
  })

  app.patch('/settings', async c => {
    const user = c.get('user')
    const patch = await parseJson(c, updateSchema)
    const updated = await updateUserSettings(db, user.id, patch)
    if (!updated) return c.json(fail('User not found'), 404)
    return c.json(ok(toProfile(updated)))
  })

  return app
}
