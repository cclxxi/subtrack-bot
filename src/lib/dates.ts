/**
 * Parses a user-entered date string into ISO `YYYY-MM-DD`, or null if unrecognized.
 *
 * Accepted formats: `YYYY-MM-DD`, `DD.MM.YYYY`, `DD.MM` (current year, rolls to
 * next year if already past), `today` / `сегодня`, `tomorrow` / `завтра`,
 * `+N` (N days from today).
 */
export function parseUserDate(
  input: string,
  today: Date = new Date(),
): string | null {
  const trimmed = input.trim().toLowerCase()

  if (trimmed === 'today' || trimmed === 'сегодня') {
    return toISO(today)
  }
  if (trimmed === 'tomorrow' || trimmed === 'завтра') {
    return toISO(shiftDays(today, 1))
  }

  const plus = trimmed.match(/^\+(\d{1,4})$/)
  if (plus) {
    return toISO(shiftDays(today, Number(plus[1])))
  }

  const iso = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (iso) {
    return validateAndFormat(Number(iso[1]), Number(iso[2]), Number(iso[3]))
  }

  const ruFull = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/)
  if (ruFull) {
    return validateAndFormat(
      Number(ruFull[3]),
      Number(ruFull[2]),
      Number(ruFull[1]),
    )
  }

  const ruShort = trimmed.match(/^(\d{1,2})\.(\d{1,2})$/)
  if (ruShort) {
    const d = Number(ruShort[1])
    const m = Number(ruShort[2])
    const candidate = validateAndFormat(today.getUTCFullYear(), m, d)
    if (!candidate) return null
    if (candidate >= toISO(today)) return candidate
    return validateAndFormat(today.getUTCFullYear() + 1, m, d)
  }

  return null
}

function validateAndFormat(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return null
  }
  return toISO(dt)
}

function toISO(d: Date): string {
  return `${String(d.getUTCFullYear()).padStart(4, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function shiftDays(d: Date, days: number): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + days),
  )
}
