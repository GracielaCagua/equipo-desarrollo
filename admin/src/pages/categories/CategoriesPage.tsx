import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, errorMessage } from '../../api/errors'
import { categoriesApi } from '../../api/services'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/ToastProvider'
import { ActiveBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { Switch } from '../../components/ui/Switch'
import { IconCategory, IconEdit, IconPlus, IconSubcategory, IconTrash } from '../../components/icons'
import type { Category, CategoryInput } from '../../types'
import { truncate } from '../../utils/format'
import { isSlug } from '../../utils/validators'
import { slugify } from '../../utils/format'

const COLORS = ['#b4533a', '#6b7d5b', '#3f6d8e', '#6d4b8f', '#a1793c', '#b56576', '#4a5a6a', '#5f5aa8', '#2f7d6d', '#8c3f5d']

const EMPTY_CATEGORY: CategoryInput = {
  name: '',
  slug: '',
  description: '',
  color: COLORS[0],
  active: true,
}

export function CategoriesPage() {
  const toast = useToast()
  const { can } = useAuth()
  const canWrite = can('categories:write')

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [refresh, setRefresh] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [form, setForm] = useState<CategoryInput>(EMPTY_CATEGORY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    categoriesApi
      .list(
        {
          search: debouncedSearch,
          active: activeFilter === '' ? undefined : activeFilter === 'true',
        },
        controller.signal,
      )
      .then(setCategories)
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setError(errorMessage(cause))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [debouncedSearch, activeFilter, refresh])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_CATEGORY })
    setErrors({})
    setSlugTouched(false)
    setModalOpen(true)
  }

  const openEdit = (category: Category) => {
    setEditing(category)
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      color: category.color,
      active: category.active,
    })
    setErrors({})
    setSlugTouched(true)
    setModalOpen(true)
  }

  const handleNameChange = (value: string) => {
    setForm((current) => ({
      ...current,
      name: value,
      slug: slugTouched ? current.slug : slugify(value),
    }))
    setErrors((current) => ({ ...current, name: '' }))
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'El nombre es obligatorio.'
    if (!form.slug.trim() || !isSlug(form.slug)) next.slug = 'Usa minúsculas, números y guiones (ej. arte-digital).'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await categoriesApi.update(editing.id, form)
        toast.success(`La categoría «${form.name}» se actualizó.`, 'Categoría actualizada')
      } else {
        await categoriesApi.create(form)
        toast.success(`La categoría «${form.name}» fue creada.`, 'Categoría creada')
      }
      setModalOpen(false)
      setRefresh((value) => value + 1)
    } catch (cause) {
      if (cause instanceof ApiError && cause.fields) setErrors(cause.fields)
      toast.error(errorMessage(cause), 'No se pudo guardar la categoría')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await categoriesApi.remove(deleteTarget.id)
      toast.success(`La categoría «${deleteTarget.name}» fue eliminada.`, 'Categoría eliminada')
      setDeleteTarget(null)
      setRefresh((value) => value + 1)
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo eliminar la categoría')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (category: Category, active: boolean) => {
    setTogglingId(category.id)
    try {
      await categoriesApi.setActive(category.id, active)
      setCategories((current) =>
        current.map((item) => (item.id === category.id ? { ...item, active } : item)),
      )
      toast.success(
        active ? `«${category.name}» vuelve a estar activa.` : `«${category.name}» quedó inactiva sin borrar sus obras.`,
        'Estado actualizado',
      )
      if (activeFilter !== '') setRefresh((value) => value + 1)
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo cambiar el estado')
    } finally {
      setTogglingId(null)
    }
  }

  const columns: Array<Column<Category>> = [
    {
      key: 'name',
      header: 'Categoría',
      width: '26%',
      render: (category) => (
        <div className="category-cell">
          <span className="category-swatch" style={{ backgroundColor: category.color }} />
          <span>
            <strong>{category.name}</strong>
            <small>/{category.slug}</small>
          </span>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Descripción',
      width: '30%',
      className: 'hide-lg',
      render: (category) => <span className="text-muted text-small">{category.description ? truncate(category.description, 90) : 'Sin descripción'}</span>,
    },
    {
      key: 'subcategories',
      header: 'Subcategorías',
      width: '12%',
      className: 'hide-sm',
      render: (category) => (
        <Link to={`/subcategorias?categoria=${category.id}`} className="count-link">
          <IconSubcategory size={15} /> {category.subcategoryCount ?? 0}
        </Link>
      ),
    },
    {
      key: 'artworks',
      header: 'Obras',
      width: '10%',
      className: 'hide-sm',
      render: (category) => <span className="count-cell">{category.artworkCount ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      width: '12%',
      render: (category) =>
        canWrite ? (
          <div className="status-cell">
            <Switch
              checked={category.active}
              onChange={(next) => handleToggle(category, next)}
              label={`${category.active ? 'Desactivar' : 'Activar'} ${category.name}`}
              disabled={togglingId === category.id}
              size="sm"
            />
            <span className={`text-small ${category.active ? 'text-success' : 'text-muted'}`}>
              {category.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        ) : (
          <ActiveBadge status={category.active ? 'active' : 'inactive'} />
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '12%',
      align: 'right',
      render: (category) =>
        canWrite ? (
          <div className="row-actions">
            <button type="button" className="icon-btn" onClick={() => openEdit(category)} title="Editar categoría" aria-label={`Editar ${category.name}`}>
              <IconEdit size={17} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={() => setDeleteTarget(category)}
              title="Eliminar categoría"
              aria-label={`Eliminar ${category.name}`}
            >
              <IconTrash size={17} />
            </button>
          </div>
        ) : null,
    },
  ]

  return (
    <div className="stack-lg">
      <PageHeader
        eyebrow="Clasificación"
        title="Categorías"
        description="Organiza el acervo por disciplinas artísticas. Desactivar una categoría conserva sus obras y subcategorías."
        actions={
          canWrite ? (
            <Button icon={<IconPlus size={18} />} onClick={openCreate}>
              Nueva categoría
            </Button>
          ) : undefined
        }
      />

      <section className="card filter-card" aria-label="Filtros de categorías">
        <div className="filter-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar categoría por nombre o descripción…" ariaLabel="Buscar categorías" />
          <div className="filter-controls filter-controls-end">
            <label className="filter-field">
              <span>Estado</span>
              <select className="input select" value={activeFilter} onChange={(event) => setActiveFilter(event.target.value as typeof activeFilter)}>
                <option value="">Todas</option>
                <option value="true">Activas</option>
                <option value="false">Inactivas</option>
              </select>
            </label>
          </div>
        </div>
        <div className="filter-foot">
          <span className="filter-summary">
            <IconCategory size={15} />
            {loading ? 'Cargando…' : `${categories.length} ${categories.length === 1 ? 'categoría' : 'categorías'}`}
          </span>
          {!canWrite && <span className="readonly-note">Tu rol es de solo lectura para la clasificación.</span>}
        </div>
      </section>

      {error ? (
        <ErrorState message={error} onRetry={() => setRefresh((value) => value + 1)} />
      ) : (
        <section className="card table-card">
          <DataTable
            columns={columns}
            rows={categories}
            rowKey={(category) => category.id}
            loading={loading}
            empty={
              <EmptyState
                icon={<IconCategory size={28} />}
                title={search || activeFilter ? 'No hay categorías con estos filtros' : 'Todavía no hay categorías'}
                description={
                  search || activeFilter
                    ? 'Ajusta la búsqueda o el estado para encontrar lo que buscas.'
                    : 'Crea la primera categoría para empezar a clasificar las obras.'
                }
                action={
                  canWrite && !search && !activeFilter ? (
                    <Button size="sm" icon={<IconPlus size={16} />} onClick={openCreate}>
                      Nueva categoría
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        </section>
      )}

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? 'Editar categoría' : 'Nueva categoría'}
        description={editing ? 'Los cambios se reflejan en todas las obras asociadas.' : 'Define el nombre, el color y la descripción de la nueva categoría.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="category-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear categoría'}
            </Button>
          </>
        }
      >
        <form id="category-form" onSubmit={submit} className="form-grid" noValidate>
          <Field label="Nombre" htmlFor="category-name" required error={errors.name}>
            <Input
              id="category-name"
              value={form.name}
              invalid={Boolean(errors.name)}
              placeholder="Ej. Pintura"
              maxLength={60}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </Field>

          <Field
            label="Slug"
            htmlFor="category-slug"
            required
            error={errors.slug}
            hint="Identificador para las URLs públicas."
          >
            <Input
              id="category-slug"
              value={form.slug}
              invalid={Boolean(errors.slug)}
              placeholder="ej-pintura"
              maxLength={80}
              onChange={(event) => {
                setSlugTouched(true)
                setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))
              }}
            />
          </Field>

          <Field label="Descripción" htmlFor="category-description" className="span-2" hint="Máximo 300 caracteres.">
            <Textarea
              id="category-description"
              rows={3}
              maxLength={300}
              value={form.description}
              placeholder="Describe brevemente esta disciplina artística…"
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>

          <Field label="Color de identificación" className="span-2" hint="Se usa en tablas, gráficos y etiquetas del repositorio.">
            <div className="color-picker">
              <input
                type="color"
                value={form.color}
                onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))}
                aria-label="Color personalizado"
                className="color-input"
              />
              <div className="color-swatches">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`color-swatch${form.color.toLowerCase() === color.toLowerCase() ? ' color-swatch-active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setForm((current) => ({ ...current, color }))}
                    aria-label={`Seleccionar color ${color}`}
                  />
                ))}
              </div>
            </div>
          </Field>

          <label className="checkbox-row span-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            <span>
              <strong>Categoría activa</strong>
              <small>Si la desactivas, no se podrá asignar a nuevas obras, pero se conserva todo su historial.</small>
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar categoría"
        description={
          deleteTarget
            ? `Solo es posible eliminar «${deleteTarget.name}» si no tiene subcategorías ni obras asociadas. Si ya tiene contenido, desactívala para conservar el historial.`
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
