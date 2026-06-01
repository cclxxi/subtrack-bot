import { eq } from 'drizzle-orm'

import type { DrizzleDB } from '../infra/database/drizzle'
import { type User, users } from '../infra/database/drizzle/schema'

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
