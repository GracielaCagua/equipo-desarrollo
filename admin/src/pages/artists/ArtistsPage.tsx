import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, errorMessage } from '../../api/errors'
import { artistsApi } from '../../api/services'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/ToastProvider'
import { ArtistTypeBadge } from '../../components/ui/Badge'
import { Avatar } from '../../components/ui/Avatar'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { Pagination } from '../../components/ui/Pagination'
import { SearchInput } from '../../components/ui/SearchInput'
import { Switch } from '../../components/ui/Switch'
import { IconArtwork, IconEdit, IconGraduation, IconPlus, IconTrash, IconUsers } from '../../components/icons'
import type { Artist, ArtistInput, ArtistType, ActiveStatus } from '../../types'
import { artistName, currentYear } from '../../utils/format'
import { isEmail, isYearInRange } from '../../utils/validators'

const LIMIT = 10
const YEAR_NOW = currentYear()

const EMPTY_ARTIST: ArtistInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  document: '',
  program: '',
  type: 'student',
  status: 'active',
  startYear: YEAR_NOW,
  endYear: undefined,
  bio: '',
}

export function ArtistsPage() {
  const toast = useToast()
  const { can } = useAuth()
  const canWrite = can('artists:write')
  const canGraduate = can('artists:graduate')
  const canDelete = can('artists:delete')

  const [artists, setArtists] = useState<Artist[]>([])
  const [meta, setMeta] = useState({ page: 1, limit: LIMIT, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ArtistType | ''>('')
  const [statusFilter, setStatusFilter] = useState<ActiveStatus | ''>('')
  const [page, setPage] = useState(1)
  const [refresh, setRefresh] = useState(0)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Artist | null>(null)
  const [form, setForm] = useState<ArtistInput>(EMPTY_ARTIST)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const [graduateTarget, setGraduateTarget] = useState<Artist | null>(null)
  const [graduating, setGraduating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Artist | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, typeFilter, statusFilter])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    artistsApi
      .list(
        {
          search: debouncedSearch,
          type: typeFilter,
          status: statusFilter,
          page,
          limit: LIMIT,
        },
        controller.signal,
      )
      .then((response) => {
        setArtists(response.data)
        setMeta(response.meta)
      })
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setError(errorMessage(cause))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [debouncedSearch, typeFilter, statusFilter, page, refresh])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_ARTIST, startYear: YEAR_NOW })
    setErrors({})
    setModalOpen(true)
  }

  const openEdit = (artist: Artist) => {
    setEditing(artist)
    setForm({
      firstName: artist.firstName,
      lastName: artist.lastName,
      email: artist.email,
      phone: artist.phone,
      document: artist.document,
      program: artist.program,
      type: artist.type,
      status: artist.status,
      startYear: artist.startYear,
      endYear: artist.endYear,
      bio: artist.bio,
    })
    setErrors({})
    setModalOpen(true)
  }

  const update = <K extends keyof ArtistInput>(key: K, value: ArtistInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.firstName.trim()) next.firstName = 'Los nombres son obligatorios.'
    if (!form.lastName.trim()) next.lastName = 'Los apellidos son obligatorios.'
    if (!form.email.trim() || !isEmail(form.email)) next.email = 'Ingresa un correo electrónico válido.'
    if (!form.program.trim()) next.program = 'El programa académico es obligatorio.'
    if (!isYearInRange(Number(form.startYear), 1950)) next.startYear = `Ingresa un año entre 1950 y ${YEAR_NOW}.`
    if (form.type === 'graduate') {
      if (!isYearInRange(Number(form.endYear), 1950)) next.endYear = `Ingresa un año entre 1950 y ${YEAR_NOW}.`
      else if (Number(form.endYear) < Number(form.startYear)) next.endYear = 'El año de graduación no puede ser anterior al de ingreso.'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await artistsApi.update(editing.id, form)
        toast.success(`El perfil de ${artistName(form)} se actualizó.`, 'Artista actualizado')
      } else {
        await artistsApi.create(form)
        toast.success(`${artistName(form)} fue registrado en el repositorio.`, 'Artista registrado')
      }
      setModalOpen(false)
      setRefresh((value) => value + 1)
    } catch (cause) {
      if (cause instanceof ApiError && cause.fields) setErrors(cause.fields)
      toast.error(errorMessage(cause), 'No se pudo guardar el artista')
    } finally {
      setSaving(false)
    }
  }

  const handleGraduate = async () => {
    if (!graduateTarget) return
    setGraduating(true)
    try {
      await artistsApi.graduate(graduateTarget.id)
      toast.success(
        `${artistName(graduateTarget)} ahora figura como graduado. Su historial y sus obras se mantienen intactos.`,
        'Estado académico actualizado',
      )
      setGraduateTarget(null)
      setRefresh((value) => value + 1)
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo actualizar el estado académico')
    } finally {
      setGraduating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await artistsApi.remove(deleteTarget.id)
      toast.success(`${artistName(deleteTarget)} fue eliminado del repositorio.`, 'Artista eliminado')
      setDeleteTarget(null)
      setRefresh((value) => value + 1)
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo eliminar el artista')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (artist: Artist, active: boolean) => {
    setTogglingId(artist.id)
    try {
      await artistsApi.setStatus(artist.id, active ? 'active' : 'inactive')
      setArtists((current) => current.map((item) => (item.id === artist.id ? { ...item, status: active ? 'active' : 'inactive' } : item)))
      toast.success(
        active ? `${artistName(artist)} está activo nuevamente.` : `${artistName(artist)} quedó inactivo sin perder sus obras.`,
        'Estado actualizado',
      )
      if (statusFilter !== '') setRefresh((value) => value + 1)
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo cambiar el estado')
    } finally {
      setTogglingId(null)
    }
  }

  const columns: Array<Column<Artist>> = [
    {
      key: 'artist',
      header: 'Artista',
      width: '26%',
      render: (artist) => (
        <div className="artist-cell artist-cell-lg">
          <Avatar firstName={artist.firstName} lastName={artist.lastName} />
          <span>
            <strong>{artistName(artist)}</strong>
            <small>{artist.email}</small>
          </span>
        </div>
      ),
    },
    {
      key: 'program',
      header: 'Programa',
      width: '18%',
      className: 'hide-lg',
      render: (artist) => <span className="text-small">{artist.program}</span>,
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '11%',
      render: (artist) => <ArtistTypeBadge type={artist.type} />,
    },
    {
      key: 'works',
      header: 'Obras',
      width: '8%',
      className: 'hide-sm',
      render: (artist) => (
        <Link to={`/obras?artista=${artist.id}`} className="count-link">
          <IconArtwork size={15} /> {artist.artworkCount ?? 0}
        </Link>
      ),
    },
    {
      key: 'years',
      header: 'Trayectoria',
      width: '12%',
      className: 'hide-md',
      render: (artist) => (
        <span className="text-small text-muted">
          {artist.startYear} — {artist.endYear ?? 'actualidad'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      width: '11%',
      render: (artist) =>
        canWrite ? (
          <Switch
            checked={artist.status === 'active'}
            onChange={(next) => handleToggle(artist, next)}
            label={`${artist.status === 'active' ? 'Desactivar' : 'Activar'} a ${artistName(artist)}`}
            disabled={togglingId === artist.id}
            size="sm"
          />
        ) : (
          <span className={`text-small ${artist.status === 'active' ? 'text-success' : 'text-muted'}`}>
            {artist.status === 'active' ? 'Activo' : 'Inactivo'}
          </span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '14%',
      align: 'right',
      render: (artist) => (
        <div className="row-actions">
          {canWrite && (
            <button type="button" className="icon-btn" onClick={() => openEdit(artist)} title="Editar artista" aria-label={`Editar a ${artistName(artist)}`}>
              <IconEdit size={17} />
            </button>
          )}
          {canGraduate && artist.type === 'student' && (
            <button
              type="button"
              className="icon-btn"
              onClick={() => setGraduateTarget(artist)}
              title="Marcar como graduado"
              aria-label={`Marcar a ${artistName(artist)} como graduado`}
            >
              <IconGraduation size={17} />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={() => setDeleteTarget(artist)}
              title="Eliminar artista"
              aria-label={`Eliminar a ${artistName(artist)}`}
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
        eyebrow="Comunidad"
        title="Estudiantes y graduados"
        description="Administra los perfiles de los artistas del repositorio. Al graduarse, el estudiante conserva su historial y sus obras."
        actions={
          canWrite ? (
            <Button icon={<IconPlus size={18} />} onClick={openCreate}>
              Nuevo artista
            </Button>
          ) : undefined
        }
      />

      <section className="card filter-card" aria-label="Filtros de artistas">
        <div className="filter-row">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Buscar por nombre, correo o documento…"
            ariaLabel="Buscar artistas"
          />
          <div className="filter-controls">
            <label className="filter-field">
              <span>Tipo</span>
              <select className="input select" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ArtistType | '')}>
                <option value="">Todos</option>
                <option value="student">Estudiantes</option>
                <option value="graduate">Graduados</option>
              </select>
            </label>
            <label className="filter-field">
              <span>Estado</span>
              <select className="input select" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ActiveStatus | '')}>
                <option value="">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </label>
          </div>
        </div>
        <div className="filter-foot">
          <span className="filter-summary">
            <IconUsers size={15} />
            {loading ? 'Buscando…' : `${meta.total} ${meta.total === 1 ? 'artista' : 'artistas'}`}
          </span>
          {!canWrite && <span className="readonly-note">Tu rol es de solo lectura para los perfiles de artistas.</span>}
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
      ) : (
        <section className="card table-card">
          <DataTable
            columns={columns}
            rows={artists}
            rowKey={(artist) => artist.id}
            loading={loading}
            empty={
              <EmptyState
                icon={<IconUsers size={28} />}
                title={search || typeFilter || statusFilter ? 'No hay artistas con estos filtros' : 'Todavía no hay artistas registrados'}
                description={
                  search || typeFilter || statusFilter
                    ? 'Prueba con otra búsqueda o limpia los filtros.'
                    : 'Registra al primer estudiante o graduado para vincularlo con sus obras.'
                }
                action={
                  canWrite && !search && !typeFilter && !statusFilter ? (
                    <Button size="sm" icon={<IconPlus size={16} />} onClick={openCreate}>
                      Nuevo artista
                    </Button>
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
            itemLabel="artistas"
          />
        </section>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Editar artista' : 'Nuevo artista'}
        description={
          editing
            ? 'Actualiza los datos del perfil. Los cambios no afectan sus obras.'
            : 'Registra a un estudiante o graduado del programa.'
        }
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="artist-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Registrar artista'}
            </Button>
          </>
        }
      >
        <form id="artist-form" onSubmit={submit} className="form-grid" noValidate>
          <Field label="Nombres" htmlFor="artist-first-name" required error={errors.firstName}>
            <Input
              id="artist-first-name"
              value={form.firstName}
              invalid={Boolean(errors.firstName)}
              placeholder="Ej. Valentina"
              onChange={(event) => update('firstName', event.target.value)}
            />
          </Field>

          <Field label="Apellidos" htmlFor="artist-last-name" required error={errors.lastName}>
            <Input
              id="artist-last-name"
              value={form.lastName}
              invalid={Boolean(errors.lastName)}
              placeholder="Ej. Restrepo Gómez"
              onChange={(event) => update('lastName', event.target.value)}
            />
          </Field>

          <Field label="Correo electrónico" htmlFor="artist-email" required error={errors.email}>
            <Input
              id="artist-email"
              type="email"
              value={form.email}
              invalid={Boolean(errors.email)}
              placeholder="nombre@universidad.edu.co"
              onChange={(event) => update('email', event.target.value)}
            />
          </Field>

          <Field label="Teléfono" htmlFor="artist-phone" error={errors.phone}>
            <Input
              id="artist-phone"
              value={form.phone}
              invalid={Boolean(errors.phone)}
              placeholder="Ej. 310 000 0000"
              onChange={(event) => update('phone', event.target.value)}
            />
          </Field>

          <Field label="Documento de identidad" htmlFor="artist-document" error={errors.document}>
            <Input
              id="artist-document"
              value={form.document}
              invalid={Boolean(errors.document)}
              placeholder="Número de documento"
              onChange={(event) => update('document', event.target.value)}
            />
          </Field>

          <Field label="Programa académico" htmlFor="artist-program" required error={errors.program}>
            <Input
              id="artist-program"
              value={form.program}
              invalid={Boolean(errors.program)}
              placeholder="Ej. Artes Plásticas"
              onChange={(event) => update('program', event.target.value)}
            />
          </Field>

          <Field label="Tipo de artista" htmlFor="artist-type" required error={errors.type}>
            <Select
              id="artist-type"
              value={form.type}
              invalid={Boolean(errors.type)}
              onChange={(event) => {
                const type = event.target.value as ArtistType
                update('type', type)
                if (type === 'student') update('endYear', undefined)
              }}
            >
              <option value="student">Estudiante</option>
              <option value="graduate">Graduado</option>
            </Select>
          </Field>

          <Field label="Año de ingreso" htmlFor="artist-start-year" required error={errors.startYear}>
            <Input
              id="artist-start-year"
              type="number"
              min={1950}
              max={YEAR_NOW}
              value={form.startYear || ''}
              invalid={Boolean(errors.startYear)}
              onChange={(event) => update('startYear', event.target.value === '' ? 0 : Number(event.target.value))}
            />
          </Field>

          {form.type === 'graduate' && (
            <Field label="Año de graduación" htmlFor="artist-end-year" required error={errors.endYear}>
              <Input
                id="artist-end-year"
                type="number"
                min={1950}
                max={YEAR_NOW}
                value={form.endYear ?? ''}
                invalid={Boolean(errors.endYear)}
                onChange={(event) => update('endYear', event.target.value === '' ? undefined : Number(event.target.value))}
              />
            </Field>
          )}

          <Field label="Biografía" htmlFor="artist-bio" className="span-2" hint="Máximo 500 caracteres. Se mostrará en el perfil público.">
            <Textarea
              id="artist-bio"
              rows={4}
              maxLength={500}
              value={form.bio}
              placeholder="Trayectoria, intereses y enfoque artístico…"
              onChange={(event) => update('bio', event.target.value)}
            />
          </Field>

          <label className="checkbox-row span-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={form.status === 'active'}
              onChange={(event) => update('status', event.target.checked ? 'active' : 'inactive')}
            />
            <span>
              <strong>Perfil activo</strong>
              <small>Los perfiles inactivos no se muestran en el sitio público, pero conservan sus obras e historial.</small>
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(graduateTarget)}
        title="Marcar como graduado"
        description={
          graduateTarget
            ? `${artistName(graduateTarget)} pasará de estudiante a graduado con año de graduación ${YEAR_NOW}. Su historial académico y todas sus obras se conservan.`
            : ''
        }
        confirmLabel="Sí, marcar como graduado"
        tone="primary"
        loading={graduating}
        onConfirm={handleGraduate}
        onClose={() => setGraduateTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar artista"
        description={
          deleteTarget
            ? `Solo es posible eliminar a ${artistName(deleteTarget)} si no tiene obras asociadas. Si ya tiene obras, desactívalo para conservar su historial.`
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
