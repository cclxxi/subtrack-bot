import {
  type Conversation,
  type ConversationFlavor,
  conversations,
  createConversation,
} from '@grammyjs/conversations'
import { Bot, type Context, session, type SessionFlavor } from 'grammy'

import { env } from '../env.ts'
import type { DrizzleDB } from '../infra/database/drizzle/index.ts'
import { ADD_CARD_CONV, addCardConversation } from './conversations/add-card.ts'
import {
  ADD_SUB_CONV,
  addSubscriptionConversation,
} from './conversations/add-subscription.ts'
import {
  EDIT_NOTIFICATION_HOUR_CONV,
  editNotificationHourConversation,
} from './conversations/edit-notification-hour.ts'
import {
  EDIT_TIMEZONE_CONV,
  editTimezoneConversation,
} from './conversations/edit-timezone.ts'
import { registerCards } from './handlers/cards.ts'
import { registerSettings } from './handlers/settings.ts'
import { registerStart } from './handlers/start.ts'
import { registerSubs } from './handlers/subs.ts'
import { registerSummary } from './handlers/summary.ts'
import { type AuthFlavor, authMiddleware } from './middleware/auth.ts'

type BaseContext = Context & AuthFlavor & SessionFlavor<Record<string, never>>
export type AppContext = ConversationFlavor<BaseContext>
// Inside a conversation the ctx is "replayed" from a stored update — it does
// NOT pass through our outer middleware chain, so AuthFlavor is intentionally
// absent here. Pass anything you need (e.g. userId) via `enter()` args.
export type AppConversationContext = Context
export type AppConversation = Conversation<AppContext, AppConversationContext>

export function createBot(db: DrizzleDB): Bot<AppContext> {
  const bot = new Bot<AppContext>(env.BOT_TOKEN)

  bot.use(session({ initial: () => ({}) }))
  bot.use(conversations<AppContext, AppConversationContext>())
  bot.use(authMiddleware(db))
  bot.use(
    createConversation<AppContext, AppConversationContext>(
      addCardConversation(db),
      ADD_CARD_CONV,
    ),
  )
  bot.use(
    createConversation<AppContext, AppConversationContext>(
      addSubscriptionConversation(db),
      ADD_SUB_CONV,
    ),
  )
  bot.use(
    createConversation<AppContext, AppConversationContext>(
      editTimezoneConversation(db),
      EDIT_TIMEZONE_CONV,
    ),
  )
  bot.use(
    createConversation<AppContext, AppConversationContext>(
      editNotificationHourConversation(db),
      EDIT_NOTIFICATION_HOUR_CONV,
    ),
  )

  registerStart(bot)
  registerCards(bot, db)
  registerSubs(bot, db)
  registerSummary(bot, db)
  registerSettings(bot, db)

  bot.catch(err => {
    console.error('Bot error:', err.error)
  })

  return bot
}
