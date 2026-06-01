import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Raised whenever Telegram WebApp `initData` fails verification — bad/absent
 * hash, missing fields, wrong bot token, or a stale `auth_date`. Callers map
 * this to a 401 without leaking which check failed.
 */
export class InitDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InitDataError'
  }
}

export interface TelegramInitDataUser {
  id: number
  firstName: string | null
  lastName: string | null
  username: string | null
  languageCode: string | null
  isPremium: boolean
}

export interface VerifiedInitData {
  user: TelegramInitDataUser
  authDate: Date
  raw: string
}

export interface VerifyInitDataOptions {
  /** Reject payloads older than this many seconds. 0 disables the check. */
  maxAgeSeconds?: number
  /** Injectable clock for deterministic tests. */
  now?: Date
}

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 // 24h

/**
 * Verify a Telegram Mini App `initData` string per the documented algorithm:
 * rebuild the data-check-string from every field except `hash`, derive the
 * secret key as HMAC_SHA256(botToken, "WebAppData"), and compare HMACs.
 *
 * @see https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyInitData(
  initDataRaw: string,
  botToken: string,
  options: VerifyInitDataOptions = {},
): VerifiedInitData {
  if (!initDataRaw) {
    throw new InitDataError('empty initData')
  }

  const params = new URLSearchParams(initDataRaw)
  const providedHash = params.get('hash')
  if (!providedHash) {
    throw new InitDataError('missing hash')
  }

  const dataCheckString = buildDataCheckString(params)
  const expectedHash = computeHash(dataCheckString, botToken)

  if (!hashesEqual(providedHash, expectedHash)) {
    throw new InitDataError('hash mismatch')
  }

  const authDate = parseAuthDate(params.get('auth_date'))
  assertFresh(authDate, options)

  const user = parseUser(params.get('user'))

  return { user, authDate, raw: initDataRaw }
}

function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = []
  for (const [key, value] of params) {
    if (key === 'hash') continue
    pairs.push(`${key}=${value}`)
  }
  pairs.sort()
  return pairs.join('\n')
}

function computeHash(dataCheckString: string, botToken: string): string {
  const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest()
  return createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
}

function hashesEqual(provided: string, expected: string): boolean {
  if (provided.length !== expected.length) return false
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected))
  } catch {
    return false
  }
}

function parseAuthDate(raw: string | null): Date {
  if (!raw) {
    throw new InitDataError('missing auth_date')
  }
  const seconds = Number(raw)
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new InitDataError('invalid auth_date')
  }
  return new Date(seconds * 1000)
}

function assertFresh(authDate: Date, options: VerifyInitDataOptions): void {
  const maxAge = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS
  if (maxAge <= 0) return

  const now = options.now ?? new Date()
  const ageSeconds = (now.getTime() - authDate.getTime()) / 1000
  if (ageSeconds > maxAge) {
    throw new InitDataError('stale auth_date')
  }
}

function parseUser(raw: string | null): TelegramInitDataUser {
  if (!raw) {
    throw new InitDataError('missing user')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new InitDataError('malformed user')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new InitDataError('malformed user')
  }

  const candidate = parsed as Record<string, unknown>
  const id = candidate.id
  if (typeof id !== 'number' || !Number.isFinite(id)) {
    throw new InitDataError('user missing id')
  }

  return {
    id,
    firstName: asStringOrNull(candidate.first_name),
    lastName: asStringOrNull(candidate.last_name),
    username: asStringOrNull(candidate.username),
    languageCode: asStringOrNull(candidate.language_code),
    isPremium: candidate.is_premium === true,
  }
}

function asStringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}
