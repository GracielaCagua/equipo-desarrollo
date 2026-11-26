import { classNames, initials } from '../../utils/format'

const PALETTES = [
  ['#6d4b8f', '#3b2c55'],
  ['#b4533a', '#6b2f24'],
  ['#3f6d8e', '#234152'],
  ['#6b7d5b', '#3a4630'],
  ['#a1793c', '#5e4520'],
  ['#b56576', '#6d3341'],
]

function paletteFor(value: string): string[] {
  const hash = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return PALETTES[hash % PALETTES.length]
}

export function Avatar({
  firstName,
  lastName,
  src,
  size = 'md',
  className,
}: {
  firstName: string
  lastName?: string
  src?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const label = `${firstName} ${lastName ?? ''}`.trim()
  const [from, to] = paletteFor(label)

  if (src) {
    return <img src={src} alt={label} className={classNames('avatar', `avatar-${size}`, className)} />
  }

  return (
    <span
      className={classNames('avatar', `avatar-${size}`, className)}
      style={{ backgroundImage: `linear-gradient(135deg, ${from}, ${to})` }}
      aria-label={label}
      title={label}
    >
      {initials(firstName, lastName)}
    </span>
  )
}
