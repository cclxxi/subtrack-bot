import { and, eq } from 'drizzle-orm'

import type { DrizzleDB } from '../infra/database/drizzle/index.ts'
import {
  type Card,
  cards,
  type NewCard,
} from '../infra/database/drizzle/schema/index.ts'

export async function listCardsForUser(
  db: DrizzleDB,
  userId: string,
): Promise<Card[]> {
  return db.query.cards.findMany({
    where: and(eq(cards.userId, userId), eq(cards.isArchived, false)),
    orderBy: (c, { asc }) => [asc(c.createdAt)],
  })
}

export async function getCardForUser(
  db: DrizzleDB,
  userId: string,
  cardId: string,
): Promise<Card | null> {
  const card = await db.query.cards.findFirst({
    where: and(eq(cards.id, cardId), eq(cards.userId, userId)),
  })
  return card ?? null
}

export async function createCard(
  db: DrizzleDB,
  data: Pick<NewCard, 'userId' | 'label' | 'last4'>,
): Promise<Card> {
  const [created] = await db.insert(cards).values(data).returning()
  return created!
}

export async function updateCard(
  db: DrizzleDB,
  userId: string,
  cardId: string,
  patch: Partial<Pick<NewCard, 'label' | 'last4'>>,
): Promise<Card | null> {
  const [updated] = await db
    .update(cards)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .returning()
  return updated ?? null
}

export async function archiveCard(
  db: DrizzleDB,
  userId: string,
  cardId: string,
): Promise<boolean> {
  const res = await db
    .update(cards)
    .set({ isArchived: true, updatedAt: new Date() })
    .where(and(eq(cards.id, cardId), eq(cards.userId, userId)))
    .returning({ id: cards.id })
  return res.length > 0
}
