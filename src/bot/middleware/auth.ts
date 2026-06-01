import { eq } from 'drizzle-orm'
import type { Context, MiddlewareFn } from 'grammy'

import type { DrizzleDB } from '../../infra/database/drizzle'
import { type User, users } from '../../infra/database/drizzle/schema'

export type AuthFlavor = { user: User }

export function authMiddleware<C extends Context & AuthFlavor>(
  db: DrizzleDB,
): MiddlewareFn<C> {
  return async (ctx, next) => {
    const from = ctx.from
    if (!from) return

    const existing = await db.query.users.findFirst({
      where: eq(users.telegramId, from.id),
    })

    if (existing) {
      ctx.user = existing
    } else {
      const [created] = await db
        .insert(users)
        .values({
          telegramId: from.id,
          username: from.username ?? null,
          firstName: from.first_name ?? null,
        })
        .returning()
      ctx.user = created!
    }

    await next()
  }
}
