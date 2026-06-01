import { eq } from 'drizzle-orm'

import type { DrizzleDB } from '../infra/database/drizzle'
import { type User, users } from '../infra/database/drizzle/schema'

export interface UpsertUserInput {
  telegramId: number
  username?: string | null
  firstName?: string | null
}

export async function upsertUserByTelegramId(
  db: DrizzleDB,
  input: UpsertUserInput,
): Promise<User> {
  const existing = await db.query.users.findFirst({
    where: eq(users.telegramId, input.telegramId),
  })
  if (existing) return existing

  const [created] = await db
    .insert(users)
    .values({
      telegramId: input.telegramId,
      username: input.username ?? null,
      firstName: input.firstName ?? null,
    })
    .returning()
  return created!
}

export async function getUserById(
  db: DrizzleDB,
  userId: string,
): Promise<User | null> {
  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return result[0] ?? null
}

export async function updateUserSettings(
  db: DrizzleDB,
  userId: string,
  patch: Partial<Pick<User, 'timezone' | 'notificationHour'>>,
): Promise<User | null> {
  const [updated] = await db
    .update(users)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(users.id, userId))
    .returning()
  return updated ?? null
}

export function isValidIanaTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz }).format(new Date())
    return true
  } catch {
    return false
  }
}
