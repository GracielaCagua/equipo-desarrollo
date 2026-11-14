import { ApiError } from './errors'
import { mockRequest } from './mock/handlers'
import { getToken } from './session'

export const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true').toLowerCase() !== 'false'
export const API_URL = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  formData?: FormData
  signal?: AbortSignal
}

/**
 * Cliente HTTP único del panel.
 * - Con VITE_USE_MOCK=true resuelve contra la API simulada (localStorage).
 * - Con VITE_USE_MOCK=false llama al backend real y adjunta el token JWT.
 */
export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const init: RequestInit = {
    method: options.method ?? 'GET',
    signal: options.signal,
  }

  if (options.formData) {
    init.body = options.formData
  } else if (options.body !== undefined) {
    init.body = JSON.stringify(options.body)
    init.headers = { 'Content-Type': 'application/json' }
  }

  if (USE_MOCK) {
    return mockRequest<T>(path, init)
  }

  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers })
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.', 0)
  }

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? (await response.json().catch(() => null))
    : await response.text().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('auth:unauthorized'))
    const data = payload as { message?: string; errors?: Record<string, string> } | null
    throw new ApiError(data?.message ?? `Error ${response.status} al procesar la solicitud.`, response.status, data?.errors)
  }

  if (response.status === 204) return undefined as T
  const data = payload as { data?: T } | T | null
  return (data && typeof data === 'object' && 'data' in data ? (data as { data: T }).data : data) as T
}

export { ApiError, errorMessage } from './errors'
