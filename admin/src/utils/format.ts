export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function initials(firstName: string, lastName = ''): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

export function formatDate(value: string | Date, opts: Intl.DateTimeFormatOptions = {}): string {
  const date = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
    .format(date)
    .replace(/\s+de\s+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatDateTime(value: string): string {
  return formatDate(value, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatBytes(bytes: number): string {
  if (!bytes) return '0 KB'
  const units = ['B', 'KB', 'MB', 'GB']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

export function classNames(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export function truncate(value: string, max = 90): string {
  return value.length > max ? `${value.slice(0, max).trimEnd()}…` : value
}

export function sum(...values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0)
}

export function artistName(artist: { firstName: string; lastName: string }): string {
  return `${artist.firstName} ${artist.lastName}`.trim()
}

export function currentYear(): number {
  return new Date().getFullYear()
}
