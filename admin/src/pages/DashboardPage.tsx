import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { dashboardApi } from '../api/services'
import { errorMessage } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { PublishBadge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState, ErrorState, Spinner } from '../components/ui/Feedback'
import {
  IconArchive,
  IconArtwork,
  IconCategory,
  IconClock,
  IconEdit,
  IconPlus,
  IconStar,
  IconTrend,
  IconUsers,
} from '../components/icons'
import type { DashboardStats } from '../types'
import { formatDate, artistName } from '../utils/format'

const statusColors: Record<'published' | 'draft' | 'archived', string> = {
  published: '#3f7d5a',
  draft: '#c9932e',
  archived: '#8b8496',
}

export function DashboardPage() {
  const { user, can } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    dashboardApi
      .stats(controller.signal)
      .then(setStats)
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setError(errorMessage(cause))
      })
      .finally(() => setLoading(false))
    return controller
  }, [])

  useEffect(() => {
    const controller = load()
    return () => controller.abort()
  }, [load])

  const firstName = user?.name.split(' ')[0] ?? ''
  const today = new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date())
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1)

  const total = stats?.artworks.total ?? 0
  const publishedPercent = total ? Math.round(((stats?.artworks.published ?? 0) / total) * 100) : 0
  const soldPercent = total ? Math.round(((stats?.artworks.sold ?? 0) / total) * 100) : 0
  const maxCategory = Math.max(1, ...(stats?.byCategory.map((item) => item.count) ?? [1]))

  const donut = (() => {
    if (!stats || total === 0) return 'conic-gradient(#e8e3f0 0deg 360deg)'
    const published = (stats.artworks.published / total) * 360
    const draft = published + (stats.artworks.draft / total) * 360
    return `conic-gradient(${statusColors.published} 0deg ${published}deg, ${statusColors.draft} ${published}deg ${draft}deg, ${statusColors.archived} ${draft}deg 360deg)`
  })()

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Resumen general"
        title={`Hola, ${firstName}`}
        description={`${todayLabel} · Este es el estado actual del repositorio.`}
        actions={
          <>
            <Link to="/obras" className="btn btn-secondary btn-md">
              <IconArtwork size={18} />
              <span>Ver obras</span>
            </Link>
            {can('artworks:write') && (
              <Link to="/obras/nueva" className="btn btn-primary btn-md">
                <IconPlus size={18} />
                <span>Nueva obra</span>
              </Link>
            )}
          </>
        }
      />

      {error && <ErrorState message={error} onRetry={load} />}

      {loading && !stats ? (
        <div className="card">
          <Spinner label="Cargando el panel" />
        </div>
      ) : stats ? (
        <>
          <section className="stats-grid" aria-label="Indicadores del repositorio">
            <article className="stat-card">
              <div className="stat-head">
                <span className="stat-label">Obras totales</span>
                <span className="stat-icon stat-icon-plum">
                  <IconArtwork size={20} />
                </span>
              </div>
              <strong className="stat-value">{stats.artworks.total}</strong>
              <div className="stat-foot">
                <span className="trend trend-up">
                  <IconTrend size={14} /> {stats.artworks.published} publicadas
                </span>
                <span>{stats.artworks.draft} borradores</span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-head">
                <span className="stat-label">Artistas</span>
                <span className="stat-icon stat-icon-blue">
                  <IconUsers size={20} />
                </span>
              </div>
              <strong className="stat-value">{stats.artists.total}</strong>
              <div className="stat-foot">
                <span>{stats.artists.students} estudiantes</span>
                <span>{stats.artists.graduates} graduados</span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-head">
                <span className="stat-label">Categorías</span>
                <span className="stat-icon stat-icon-green">
                  <IconCategory size={20} />
                </span>
              </div>
              <strong className="stat-value">{stats.categories.total}</strong>
              <div className="stat-foot">
                <span>{stats.categories.subcategories} subcategorías</span>
                <span>{stats.categories.active} activas</span>
              </div>
            </article>

            <article className="stat-card">
              <div className="stat-head">
                <span className="stat-label">Obras vendidas</span>
                <span className="stat-icon stat-icon-gold">
                  <IconStar size={20} />
                </span>
              </div>
              <strong className="stat-value">{stats.artworks.sold}</strong>
              <div className="stat-foot">
                <span className="trend">{soldPercent}% del total</span>
                <span>{stats.artworks.archived} archivadas</span>
              </div>
            </article>
          </section>

          <section className="dashboard-grid">
            <article className="card card-chart">
              <div className="card-head">
                <div>
                  <h2>Obras por categoría</h2>
                  <p>Distribución del acervo según la clasificación actual.</p>
                </div>
                <Link to="/categorias" className="text-link">
                  Gestionar
                </Link>
              </div>
              <div className="bar-list">
                {stats.byCategory.map((category) => (
                  <div className="bar-row" key={category.id}>
                    <span className="bar-dot" style={{ backgroundColor: category.color }} />
                    <span className="bar-name">{category.name}</span>
                    <div className="bar-track">
                      <span
                        className="bar-fill"
                        style={{
                          width: `${Math.max(4, (category.count / maxCategory) * 100)}%`,
                          background: `linear-gradient(90deg, ${category.color}, ${category.color}cc)`,
                        }}
                      />
                    </div>
                    <span className="bar-value">{category.count}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="card card-status">
              <div className="card-head">
                <div>
                  <h2>Estado de publicación</h2>
                  <p>Visibilidad actual de las obras.</p>
                </div>
              </div>
              <div className="donut-wrap">
                <div className="donut" style={{ background: donut }} role="img" aria-label={`${publishedPercent}% de obras publicadas`}>
                  <div className="donut-hole">
                    <strong>{publishedPercent}%</strong>
                    <span>publicadas</span>
                  </div>
                </div>
              </div>
              <ul className="legend">
                <li>
                  <span className="legend-dot" style={{ background: statusColors.published }} />
                  Publicadas
                  <strong>{stats.artworks.published}</strong>
                </li>
                <li>
                  <span className="legend-dot" style={{ background: statusColors.draft }} />
                  Borradores
                  <strong>{stats.artworks.draft}</strong>
                </li>
                <li>
                  <span className="legend-dot" style={{ background: statusColors.archived }} />
                  Archivadas
                  <strong>{stats.artworks.archived}</strong>
                </li>
              </ul>
            </article>

            <article className="card dashboard-recent">
              <div className="card-head">
                <div>
                  <h2>Obras recientes</h2>
                  <p>Últimas actualizaciones del repositorio.</p>
                </div>
                <Link to="/obras" className="text-link">
                  Ver todas
                </Link>
              </div>

              {stats.recent.length === 0 ? (
                <EmptyState
                  icon={<IconArtwork size={26} />}
                  title="Aún no hay obras registradas"
                  description="Crea la primera obra para empezar a construir el repositorio."
                  action={
                    can('artworks:write') ? (
                      <Link to="/obras/nueva" className="btn btn-primary btn-sm">
                        <IconPlus size={16} /> Nueva obra
                      </Link>
                    ) : undefined
                  }
                />
              ) : (
                <ul className="recent-list">
                  {stats.recent.map((work) => (
                    <li key={work.id}>
                      <Link to={`/obras/${work.id}/editar`} className="recent-item">
                        <span className="recent-thumb">
                          {work.coverUrl ? <img src={work.coverUrl} alt="" /> : <IconArtwork size={20} />}
                        </span>
                        <span className="recent-main">
                          <strong>{work.title}</strong>
                          <span>
                            {work.artist ? artistName(work.artist) : 'Sin artista'} · {work.category?.name ?? 'Sin categoría'}
                          </span>
                        </span>
                        <span className="recent-meta">
                          <PublishBadge status={work.status} />
                          <span className="recent-date">
                            <IconClock size={13} /> {formatDate(work.updatedAt)}
                          </span>
                        </span>
                        <IconEdit size={16} className="recent-edit" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <aside className="dashboard-side">
              <article className="card quick-card">
                <div className="card-head">
                  <div>
                    <h2>Acciones rápidas</h2>
                    <p>Atajos para gestionar el contenido.</p>
                  </div>
                </div>
                <div className="quick-actions">
                  {can('artworks:write') && (
                    <Link to="/obras/nueva" className="quick-action">
                      <span className="quick-icon"><IconPlus size={18} /></span>
                      <span>
                        <strong>Registrar obra</strong>
                        <small>Sube imágenes, videos y documentos</small>
                      </span>
                    </Link>
                  )}
                  {can('categories:write') && (
                    <Link to="/categorias" className="quick-action">
                      <span className="quick-icon"><IconCategory size={18} /></span>
                      <span>
                        <strong>Administrar categorías</strong>
                        <small>Organiza la clasificación del acervo</small>
                      </span>
                    </Link>
                  )}
                  {can('artists:write') && (
                    <Link to="/artistas" className="quick-action">
                      <span className="quick-icon"><IconUsers size={18} /></span>
                      <span>
                        <strong>Registrar artista</strong>
                        <small>Estudiantes y graduados</small>
                      </span>
                    </Link>
                  )}
                  <Link to="/obras?status=archived" className="quick-action">
                    <span className="quick-icon"><IconArchive size={18} /></span>
                    <span>
                      <strong>Revisar archivadas</strong>
                      <small>Obras fuera de circulación pública</small>
                    </span>
                  </Link>
                </div>
              </article>

              <article className="card artist-mini-card">
                <div className="card-head">
                  <div>
                    <h2>Comunidad</h2>
                    <p>Trayectorias registradas.</p>
                  </div>
                  <Link to="/artistas" className="text-link">Ver</Link>
                </div>
                <div className="community-stats">
                  <div className="community-stat">
                    <span>Estudiantes</span>
                    <strong>{stats.artists.students}</strong>
                  </div>
                  <div className="community-stat">
                    <span>Graduados</span>
                    <strong>{stats.artists.graduates}</strong>
                  </div>
                </div>
                <p className="artist-mini-note">
                  {stats.artists.inactive > 0
                    ? `${stats.artists.inactive} ${stats.artists.inactive === 1 ? 'perfil inactivo conserva' : 'perfiles inactivos conservan'} sus obras e historial.`
                    : 'Todos los perfiles están activos y disponibles en el sitio público.'}
                </p>
              </article>
            </aside>
          </section>
        </>
      ) : null}
    </div>
  )
}
