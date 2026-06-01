import { describe, expect, test } from 'bun:test'
import { createHmac } from 'node:crypto'

import { InitDataError, verifyInitData } from './telegram-init-data.ts'

const BOT_TOKEN = '123456:test-bot-token'

/**
 * Build a signed initData query string the same way Telegram does, so the
 * verifier can be exercised against a known-good payload.
 */
function signInitData(
  params: Record<string, string>,
  token: string = BOT_TOKEN,
): string {
  const dataCheckString = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('\n')

  const secretKey = createHmac('sha256', 'WebAppData').update(token).digest()
  const hash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  const search = new URLSearchParams({ ...params, hash })
  return search.toString()
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000)
}

const validUser = JSON.stringify({
  id: 42,
  first_name: 'Ada',
  username: 'ada',
})

describe('verifyInitData', () => {
  test('accepts a correctly signed payload and parses the user', () => {
    const raw = signInitData({
      user: validUser,
      auth_date: String(nowSeconds()),
      query_id: 'AAExample',
    })

    const result = verifyInitData(raw, BOT_TOKEN)

    expect(result.user.id).toBe(42)
    expect(result.user.firstName).toBe('Ada')
    expect(result.user.username).toBe('ada')
    expect(result.raw).toBe(raw)
  })

  test('rejects a tampered hash', () => {
    const raw = signInitData({
      user: validUser,
      auth_date: String(nowSeconds()),
    })
    const tampered = raw.replace(/hash=[0-9a-f]+/, 'hash=deadbeef')

    expect(() => verifyInitData(tampered, BOT_TOKEN)).toThrow(InitDataError)
  })

  test('rejects when a field is altered after signing', () => {
    const raw = signInitData({
      user: validUser,
      auth_date: String(nowSeconds()),
    })
    const altered = raw.replace('Ada', 'Eve')

    expect(() => verifyInitData(altered, BOT_TOKEN)).toThrow(InitDataError)
  })

  test('rejects a payload signed with a different token', () => {
    const raw = signInitData(
      { user: validUser, auth_date: String(nowSeconds()) },
      'other-token',
    )

    expect(() => verifyInitData(raw, BOT_TOKEN)).toThrow(InitDataError)
  })

  test('rejects when hash is missing', () => {
    expect(() =>
      verifyInitData(`user=${encodeURIComponent(validUser)}`, BOT_TOKEN),
    ).toThrow(InitDataError)
  })

  test('rejects when user is missing', () => {
    const raw = signInitData({ auth_date: String(nowSeconds()) })
    expect(() => verifyInitData(raw, BOT_TOKEN)).toThrow(InitDataError)
  })

  test('rejects a stale auth_date', () => {
    const old = nowSeconds() - 60 * 60 * 25 // 25 hours ago
    const raw = signInitData({ user: validUser, auth_date: String(old) })

    expect(() =>
      verifyInitData(raw, BOT_TOKEN, { maxAgeSeconds: 60 * 60 * 24 }),
    ).toThrow(InitDataError)
  })

  test('accepts a fresh auth_date within maxAge', () => {
    const recent = nowSeconds() - 60
    const raw = signInitData({ user: validUser, auth_date: String(recent) })

    const result = verifyInitData(raw, BOT_TOKEN, { maxAgeSeconds: 60 * 60 })
    expect(result.user.id).toBe(42)
  })

  test('rejects an empty string', () => {
    expect(() => verifyInitData('', BOT_TOKEN)).toThrow(InitDataError)
  })
})
