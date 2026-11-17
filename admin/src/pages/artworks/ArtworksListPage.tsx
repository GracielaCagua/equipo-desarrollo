import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage } from '../../api/errors'
import { artistsApi, artworksApi, categoriesApi, subcategoriesApi } from '../../api/services'
import { useAuth } from '../../auth/AuthContext'
import { useDebouncedValue } from '../../hooks/useDebouncedValue'
import { useToast } from '../../components/ToastProvider'
import { Avatar } from '../../components/ui/Avatar'
import { PublishBadge, PUBLISH_LABELS, SoldBadge } from '../../components/ui/Badge'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { IconArtwork, IconEdit, IconFilter, IconPlus, IconRefresh, IconTrash } from '../../components/icons'
import type { Artist, Artwork, Category, PublishStatus, Subcategory } from '../../types'
import { artistName, formatDate } from '../../utils/format'

const LIMIT = 10

export function ArtworksListPage() {
  const { can } = useAuth()
  const toast = useToast()
  const [searchParams] = useSearchParams()

  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const debouncedSearch = useDebouncedValue(search, 400)
  const [status, setStatus] = useState<PublishStatus | ''>((searchParams.get('status') as PublishStatus) ?? '')
  const [categoryId, setCategoryId] = useState(searchParams.get('categoria') ?? '')
  const [subcategoryId, setSubcategoryId] = useState(searchParams.get('subcategoria') ?? '')
  const [artistId, setArtistId] = useState(searchParams.get('artista') ?? '')
  const [page, setPage] = useState(1)

  const [artworks, setArtworks] = useState<Artwork[]>([])
  const [meta, setMeta] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [savingId, setSavingId] = useState<string | null>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [artists, setArtists] = useState<Artist[]>([])

  const [deleteTarget, setDeleteTarget] = useState<Artwork | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      categoriesApi.list({}, controller.signal),
      subcategoriesApi.list({}, controller.signal),
      artistsApi.list({ limit: 200 }, controller.signal),
    ])
      .then(([categoryList, subcategoryList, artistList]) => {
        setCategories(categoryList)
        setSubcategories(subcategoryList)
        setArtists(artistList.data)
      })
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') toast.error(errorMessage(cause), 'No se pudieron cargar los filtros')
      })
    return () => controller.abort()
  }, [toast])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, status, categoryId, subcategoryId, artistId])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    artworksApi
      .list(
        {
          search: debouncedSearch,
          status,
          categoryId,
          subcategoryId,
          artistId,
          page,
          limit: LIMIT,
        },
        controller.signal,
      )
      .then((response) => {
        setArtworks(response.data)
        setMeta(response.meta)
      })
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setError(errorMessage(cause))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [debouncedSearch, status, categoryId, subcategoryId, artistId, page, refresh])

  const subcategoryOptions = useMemo(
    () => subcategories.filter((item) => !categoryId || item.categoryId === categoryId),
    [subcategories, categoryId],
  )

  const hasFilters = Boolean(search || status || categoryId || subcategoryId || artistId)

  const clearFilters = () => {
    setSearch('')
    setStatus('')
    setCategoryId('')
    setSubcategoryId('')
    setArtistId('')
    setPage(1)
  }

  const reload = useCallback(() => setRefresh((value) => value + 1), [])

  const handleStatusChange = async (work: Artwork, nextStatus: PublishStatus) => {
    setSavingId(work.id)
    try {
      await artworksApi.changeStatus(work.id, nextStatus)
      toast.success(`«${work.title}» ahora está en estado ${PUBLISH_LABELS[nextStatus].toLowerCase()}.`, 'Estado actualizado')
      reload()
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo cambiar el estado')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await artworksApi.remove(deleteTarget.id)
      toast.success(`La obra «${deleteTarget.title}» fue eliminada.`, 'Obra eliminada')
      setDeleteTarget(null)
      reload()
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo eliminar la obra')
    } finally {
      setDeleting(false)
    }
  }

  const columns: Array<Column<Artwork>> = [
    {
      key: 'work',
      header: 'Obra',
      width: '30%',
      render: (work) => (
        <div className="work-cell">
          <span className="work-thumb">
            {work.coverUrl ? <img src={work.coverUrl} alt="" loading="lazy" /> : <IconArtwork size={20} />}
          </span>
          <span className="work-cell-info">
            <Link to={`/obras/${work.id}/editar`} className="work-title">
              {work.title}
            </Link>
            <span className="work-sub">{work.technique} · {work.year}</span>
          </span>
        </div>
      ),
    },
    {
      key: 'artist',
      header: 'Autor',
      width: '18%',
      className: 'hide-sm',
      render: (work) =>
        work.artist ? (
          <div className="artist-cell">
            <Avatar firstName={work.artist.firstName} lastName={work.artist.lastName} size="sm" />
            <span>
              <strong>{artistName(work.artist)}</strong>
              <small>{work.artist.program}</small>
            </span>
          </div>
        ) : (
          <span className="text-muted">Sin artista</span>
        ),
    },
    {
      key: 'category',
      header: 'Clasificación',
      width: '16%',
      className: 'hide-lg',
      render: (work) => (
        <div className="classification-cell">
          <span className="classification-category">
            <span className="bar-dot" style={{ backgroundColor: work.category?.color ?? '#8b8496' }} />
            {work.category?.name ?? '—'}
          </span>
          <small>{work.subcategory?.name ?? '—'}</small>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '14%',
      render: (work) => (
        <select
          className={`status-select status-select-${work.status}`}
          value={work.status}
          disabled={savingId === work.id}
          onChange={(event) => handleStatusChange(work, event.target.value as PublishStatus)}
          aria-label={`Cambiar estado de publicación de ${work.title}`}
        >
          <option value="draft">Borrador</option>
          <option value="published">Publicada</option>
          <option value="archived">Archivada</option>
        </select>
      ),
    },
    {
      key: 'sold',
      header: 'Comercial',
      width: '10%',
      className: 'hide-md',
      render: (work) => <SoldBadge sold={work.sold} />,
    },
    {
      key: 'updated',
      header: 'Actualizada',
      width: '11%',
      className: 'hide-lg',
      render: (work) => <span className="text-muted text-small">{formatDate(work.updatedAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      width: '8%',
      align: 'right',
      render: (work) => (
        <div className="row-actions">
          <Link to={`/obras/${work.id}/editar`} className="icon-btn" title="Editar obra" aria-label={`Editar ${work.title}`}>
            <IconEdit size={17} />
          </Link>
          {can('artworks:delete') && (
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={() => setDeleteTarget(work)}
              title="Eliminar obra"
              aria-label={`Eliminar ${work.title}`}
            >
              <IconTrash size={17} />
            </button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Contenido"
        title="Obras"
        description="Registra, clasifica y publica las obras del repositorio. Los cambios de estado se reflejan de inmediato en el sitio público."
        actions={
          can('artworks:write') ? (
            <Link to="/obras/nueva" className="btn btn-primary btn-md">
              <IconPlus size={18} />
              <span>Nueva obra</span>
            </Link>
          ) : undefined
        }
      />

      <section className="card filter-card" aria-label="Filtros de obras">
        <div className="filter-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por título, técnica o artista…"
            ariaLabel="Buscar obras"
          />
          <div className="filter-controls">
            <label className="filter-field">
              <span>Estado</span>
              <select className="input select" value={status} onChange={(event) => setStatus(event.target.value as PublishStatus | '')}>
                <option value="">Todos</option>
                <option value="draft">Borradores</option>
                <option value="published">Publicadas</option>
                <option value="archived">Archivadas</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Categoría</span>
              <select
                className="input select"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value)
                  setSubcategoryId('')
                }}
              >
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Subcategoría</span>
              <select
                className="input select"
                value={subcategoryId}
                onChange={(event) => setSubcategoryId(event.target.value)}
                disabled={subcategoryOptions.length === 0}
              >
                <option value="">Todas</option>
                {subcategoryOptions.map((subcategory) => (
                  <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>
                ))}
              </select>
            </label>
            <label className="filter-field">
              <span>Artista</span>
              <select className="input select" value={artistId} onChange={(event) => setArtistId(event.target.value)}>
                <option value="">Todos</option>
                {artists.map((artist) => (
                  <option key={artist.id} value={artist.id}>{artistName(artist)}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="filter-foot">
          <span className="filter-summary">
            <IconFilter size={15} />
            {loading ? 'Buscando…' : `${meta.total} ${meta.total === 1 ? 'obra encontrada' : 'obras encontradas'}`}
            {hasFilters && !loading && <strong> · filtros activos</strong>}
          </span>
          <div className="filter-actions">
            <button type="button" className="text-btn" onClick={reload} disabled={loading} title="Recargar listado">
              <IconRefresh size={15} /> Recargar
            </button>
            {hasFilters && (
              <button type="button" className="text-btn" onClick={clearFilters}>
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <section className="card table-card">
          <DataTable
            columns={columns}
            rows={artworks}
            rowKey={(work) => work.id}
            loading={loading}
            empty={
              <EmptyState
                icon={<IconArtwork size={28} />}
                title={hasFilters ? 'No encontramos obras con estos filtros' : 'El repositorio aún no tiene obras'}
                description={
                  hasFilters
                    ? 'Prueba con otra búsqueda o limpia los filtros para ver todo el contenido.'
                    : 'Registra la primera obra para empezar a construir el acervo.'
                }
                action={
                  hasFilters ? (
                    <button type="button" className="btn btn-secondary btn-sm" onClick={clearFilters}>
                      Limpiar filtros
                    </button>
                  ) : can('artworks:write') ? (
                    <Link to="/obras/nueva" className="btn btn-primary btn-sm">
                      <IconPlus size={16} /> Nueva obra
                    </Link>
                  ) : undefined
                }
              />
            }
          />
          <Pagination
            page={meta.page}
            totalPages={meta.totalPages}
            total={meta.total}
            limit={meta.limit}
            onPageChange={setPage}
            itemLabel="obras"
          />
        </section>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar obra"
        description={
          deleteTarget
            ? `Se eliminará permanentemente «${deleteTarget.title}» junto con sus archivos asociados. Si solo deseas ocultarla, cámbiala a estado archivada.`
            : ''
        }
        confirmLabel="Sí, eliminar"
        loading={deleting}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}
