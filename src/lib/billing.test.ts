import { describe, expect, test } from 'bun:test'

import { nextBillingDate } from './billing.ts'

describe('nextBillingDate', () => {
  test('day +1', () => {
    expect(nextBillingDate('day', '2026-05-29')).toBe('2026-05-30')
  })

  test('day crosses month', () => {
    expect(nextBillingDate('day', '2026-05-31')).toBe('2026-06-01')
  })

  test('day crosses year', () => {
    expect(nextBillingDate('day', '2025-12-31')).toBe('2026-01-01')
  })

  test('week +7', () => {
    expect(nextBillingDate('week', '2026-05-29')).toBe('2026-06-05')
  })

  test('month from mid-month', () => {
    expect(nextBillingDate('month', '2026-01-15')).toBe('2026-02-15')
  })

  test('month from Jan 31 clamps to Feb 28 (non-leap)', () => {
    expect(nextBillingDate('month', '2026-01-31')).toBe('2026-02-28')
  })

  test('month from Jan 31 clamps to Feb 29 (leap)', () => {
    expect(nextBillingDate('month', '2024-01-31')).toBe('2024-02-29')
  })

  test('month from March 31 → April 30', () => {
    expect(nextBillingDate('month', '2026-03-31')).toBe('2026-04-30')
  })

  test('year +1', () => {
    expect(nextBillingDate('year', '2025-06-15')).toBe('2026-06-15')
  })

  test('year from Feb 29 leap → Feb 28 next year', () => {
    expect(nextBillingDate('year', '2024-02-29')).toBe('2025-02-28')
  })

  test('custom 30 days', () => {
    expect(nextBillingDate('custom', '2026-05-29', 30)).toBe('2026-06-28')
  })

  test('custom throws without intervalDays', () => {
    expect(() => nextBillingDate('custom', '2026-05-29')).toThrow()
  })

  test('rejects invalid date string', () => {
    expect(() => nextBillingDate('day', '2026/05/29')).toThrow()
  })
})
