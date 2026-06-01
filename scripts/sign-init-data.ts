/**
 * Dev-only helper: print a signed Telegram `initData` string for a fake user
 * so the Mini App can be run in a plain browser against the local API.
 *
 *   bun scripts/sign-init-data.ts
 *
 * Copy the output into web/.env.local as VITE_DEV_INIT_DATA=...
 * Uses the same HMAC algorithm the verifier checks (src/lib/telegram-init-data.ts).
 */
import { createHmac } from 'node:crypto'

import { env } from '../src/env.ts'

const user = {
  id: 1,
  first_name: 'Dev',
  username: 'dev',
  language_code: 'ru',
}

const params: Record<string, string> = {
  user: JSON.stringify(user),
  auth_date: String(Math.floor(Date.now() / 1000)),
  query_id: 'dev-session',
}

const dataCheckString = Object.keys(params)
  .sort()
  .map(key => `${key}=${params[key]}`)
  .join('\n')

const secretKey = createHmac('sha256', 'WebAppData')
  .update(env.BOT_TOKEN)
  .digest()
const hash = createHmac('sha256', secretKey)
  .update(dataCheckString)
  .digest('hex')

const search = new URLSearchParams({ ...params, hash })
console.log(search.toString())
