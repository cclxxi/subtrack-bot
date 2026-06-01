import type { Context, MiddlewareFn } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import type { User } from '../../infra/database/drizzle/schema'
import { upsertUserByTelegramId } from '../../services/users.ts'

export type AuthFlavor = { user: User }

export function authMiddleware<C extends Context & AuthFlavor>(
  db: DrizzleDB,
): MiddlewareFn<C> {
  return async (ctx, next) => {
    const from = ctx.from
    if (!from) return

    ctx.user = await upsertUserByTelegramId(db, {
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
    })

    await next()
  }
}
