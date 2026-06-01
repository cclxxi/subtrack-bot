import type { Context } from 'hono'
import { z } from 'zod'

/**
 * Thrown by {@link parseJson} when a request body is missing or fails schema
 * validation. The API router maps it to a 400 via `onError`.
 */
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Read and validate a JSON request body against a Zod schema. Fails fast with
 * a {@link ValidationError} carrying a readable message — never trusts the
 * raw payload past this boundary.
 */
export async function parseJson<T>(
  c: Context,
  schema: z.ZodType<T>,
): Promise<T> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new ValidationError('Request body must be valid JSON')
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    throw new ValidationError(z.prettifyError(result.error))
  }
  return result.data
}
