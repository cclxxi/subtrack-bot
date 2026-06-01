import type { MiddlewareHandler } from 'hono'

import { env } from '../../env.ts'
import type { DrizzleDB } from '../../infra/database/drizzle'
import { InitDataError, verifyInitData } from '../../lib/telegram-init-data.ts'
import { upsertUserByTelegramId } from '../../services/users.ts'
import { fail } from '../response.ts'
import type { AppEnv } from '../types.ts'

// Telegram Mini Apps send initData via `Authorization: tma <initDataRaw>`.
const AUTH_SCHEME = 'tma'
const MAX_AGE_SECONDS = 60 * 60 * 24 // accept initData up to 24h old

function extractInitData(header: string | undefined): string | null {
  if (!header) return null
  const [scheme, ...rest] = header.split(' ')
  if (scheme !== AUTH_SCHEME || rest.length === 0) return null
  const raw = rest.join(' ').trim()
  return raw.length > 0 ? raw : null
}

/**
 * Authenticates WebApp API requests by verifying Telegram `initData` and
 * upserting the user. Mirrors the bot's auth middleware
 * (src/bot/middleware/auth.ts) so both surfaces resolve the same `User`.
 */
export function webAppAuth(db: DrizzleDB): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const initData = extractInitData(c.req.header('Authorization'))
    if (!initData) {
      return c.json(fail('Missing Telegram authentication'), 401)
    }

    let verified
    try {
      verified = verifyInitData(initData, env.BOT_TOKEN, {
        maxAgeSeconds: MAX_AGE_SECONDS,
      })
    } catch (error: unknown) {
      if (error instanceof InitDataError) {
        return c.json(fail('Invalid Telegram authentication'), 401)
      }
      throw error
    }

    const user = await upsertUserByTelegramId(db, {
      telegramId: verified.user.id,
      username: verified.user.username,
      firstName: verified.user.firstName,
    })

    c.set('user', user)
    await next()
  }
}
