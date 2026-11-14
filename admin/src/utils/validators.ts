export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function required(value: unknown): boolean {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined
}

export function minLength(value: string, length: number): boolean {
  return value.trim().length >= length
}

export function isEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim())
}

export function isYearInRange(value: number, from = 1900, to = new Date().getFullYear()): boolean {
  return Number.isInteger(value) && value >= from && value <= to
}

export function isSlug(value: string): boolean {
  return SLUG_REGEX.test(value)
}
