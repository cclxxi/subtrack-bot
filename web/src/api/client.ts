import { getInitDataRaw } from '../telegram/webapp.ts'
import type { ApiResponse } from './types.ts'

export class ApiError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

/**
 * Single entry point for the WebApp API. Attaches Telegram initData on every
 * request and unwraps the `{ success, data, error }` envelope, throwing
 * {@link ApiError} on failure so callers (and TanStack Query) handle one path.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const initData = getInitDataRaw()

  const response = await fetch(`/api${path}`, {
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `tma ${initData}`,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  let payload: ApiResponse<T> | null = null
  try {
    payload = (await response.json()) as ApiResponse<T>
  } catch {
    throw new ApiError('Malformed server response', response.status)
  }

  if (!response.ok || !payload.success) {
    const message =
      payload && !payload.success ? payload.error : 'Request failed'
    throw new ApiError(message, response.status)
  }

  return payload.data
}
