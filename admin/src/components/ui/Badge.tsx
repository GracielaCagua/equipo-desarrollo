import type { ReactNode } from 'react'
import type { ActiveStatus, ArtistType, PublishStatus } from '../../types'
import { classNames } from '../../utils/format'

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'gold'

export function Badge({ tone = 'neutral', children, dot = false }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return (
    <span className={classNames('badge', `badge-${tone}`)}>
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export const PUBLISH_LABELS: Record<PublishStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  archived: 'Archivada',
}

export function PublishBadge({ status }: { status: PublishStatus }) {
  const tone: Tone = status === 'published' ? 'success' : status === 'draft' ? 'warning' : 'neutral'
  return <Badge tone={tone} dot>{PUBLISH_LABELS[status]}</Badge>
}

export function ArtistTypeBadge({ type }: { type: ArtistType }) {
  return type === 'graduate' ? <Badge tone="purple">Graduado</Badge> : <Badge tone="info">Estudiante</Badge>
}

export function ActiveBadge({ status }: { status: ActiveStatus }) {
  return status === 'active' ? <Badge tone="success" dot>Activo</Badge> : <Badge tone="danger" dot>Inactivo</Badge>
}

export function SoldBadge({ sold }: { sold: boolean }) {
  return sold ? <Badge tone="gold">Vendida</Badge> : <Badge tone="neutral">No vendida</Badge>
}
