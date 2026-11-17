export class ApiError extends Error {
  status: number
  fields?: Record<string, string>

  constructor(message: string, status = 500, fields?: Record<string, string>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.'
}
