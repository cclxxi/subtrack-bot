import { type Context, GrammyError } from 'grammy'

/**
 * Wraps `ctx.answerCallbackQuery` and swallows the "query is too old" /
 * "query ID is invalid" error (Telegram 400). These happen when the callback
 * is older than ~15 seconds — usually because the bot picked up a stale update
 * after a restart. UX is unaffected, only the noise.
 */
export async function safeAnswerCallback(
  ctx: Context,
  text?: string,
): Promise<void> {
  try {
    await ctx.answerCallbackQuery(text ? { text } : undefined)
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 400) return
    throw err
  }
}
