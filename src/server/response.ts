/**
 * Consistent API envelope shared by every WebApp route.
 * Mirrors the project-wide response convention: a success flag plus a
 * mutually-exclusive `data` / `error` payload.
 */
export interface ApiSuccess<T> {
  success: true
  data: T
}

export interface ApiFailure {
  success: false
  error: string
}

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data }
}

export function fail(error: string): ApiFailure {
  return { success: false, error }
}
