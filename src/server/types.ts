import type { User } from '../infra/database/drizzle/schema'

/**
 * Hono environment shared across the WebApp API. `user` is populated by
 * {@link webAppAuth} after successful initData verification.
 */
export type AppEnv = {
  Variables: {
    user: User
  }
}
