import { useEffect, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../../api/errors'
import { categoriesApi, subcategoriesApi } from '../../api/services'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/ToastProvider'
import { ActiveBadge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { DataTable, type Column } from '../../components/ui/DataTable'
import { EmptyState, ErrorState } from '../../components/ui/Feedback'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { Modal } from '../../components/ui/Modal'
import { PageHeader } from '../../components/ui/PageHeader'
import { SearchInput } from '../../components/ui/SearchInput'
import { Switch } from '../../components/ui/Switch'
import { IconEdit, IconPlus, IconSubcategory, IconTrash } from '../../components/icons'
import type { Category, Subcategory, SubcategoryInput } from '../../types'
import { slugify, truncate } from '../../utils/format'
import { isSlug } from '../../utils/validators'

const EMPTY_SUBCATEGORY: SubcategoryInput = {
  categoryId: '',
  name: '',
  slug: '',
  description: '',
  active: true,
}

export function SubcategoriesPage() {
  const toast = useToast()
  const { can } = useAuth()
  const canWrite = can('subcategories:write')
  const [searchParams] = useSearchParams()

  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(searchParams.get('categoria') ?? '')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [refresh, setRefresh] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Subcategory | null>(null)
  const [form, setForm] = useState<SubcategoryInput>(EMPTY_SUBCATEGORY)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [slugTouched, setSlugTouched] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Subcategory | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 350)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    const controller = new AbortController()
    categoriesApi
      .list({}, controller.signal)
      .then(setCategories)
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setError(errorMessage(cause))
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    subcategoriesApi
      .list(
        {
          search: debouncedSearch,
          categoryId: categoryFilter,
          active: activeFilter === '' ? undefined : activeFilter === 'true',
        },
        controller.signal,
      )
      .then(setSubcategories)
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setError(errorMessage(cause))
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [debouncedSearch, categoryFilter, activeFilter, refresh])

  const openCreate = () => {
    if (categories.length === 0) {
      toast.info('Primero crea una categoría principal para poder añadir subcategorías.', 'No hay categorías')
      return
    }
    setEditing(null)
    setForm({ ...EMPTY_SUBCATEGORY, categoryId: categoryFilter || categories[0].id })
    setErrors({})
    setSlugTouched(false)
    setModalOpen(true)
  }

  const openEdit = (subcategory: Subcategory) => {
    setEditing(subcategory)
    setForm({
      categoryId: subcategory.categoryId,
      name: subcategory.name,
      slug: subcategory.slug,
      description: subcategory.description,
      active: subcategory.active,
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
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (!form.categoryId) next.categoryId = 'Selecciona la categoría principal.'
    if (!form.name.trim()) next.name = 'El nombre es obligatorio.'
    if (!form.slug.trim() || !isSlug(form.slug)) next.slug = 'Usa minúsculas, números y guiones (ej. video-instalacion).'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (editing) {
        await subcategoriesApi.update(editing.id, form)
        toast.success(`La subcategoría «${form.name}» se actualizó.`, 'Subcategoría actualizada')
      } else {
        await subcategoriesApi.create(form)
        toast.success(`La subcategoría «${form.name}» fue creada.`, 'Subcategoría creada')
      }
      setModalOpen(false)
      setRefresh((value) => value + 1)
    } catch (cause) {
      if (cause instanceof ApiError && cause.fields) setErrors(cause.fields)
      toast.error(errorMessage(cause), 'No se pudo guardar la subcategoría')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await subcategoriesApi.remove(deleteTarget.id)
      toast.success(`La subcategoría «${deleteTarget.name}» fue eliminada.`, 'Subcategoría eliminada')
      setDeleteTarget(null)
      setRefresh((value) => value + 1)
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo eliminar la subcategoría')
    } finally {
      setDeleting(false)
    }
  }

  const handleToggle = async (subcategory: Subcategory, active: boolean) => {
    setTogglingId(subcategory.id)
    try {
      await subcategoriesApi.setActive(subcategory.id, active)
      setSubcategories((current) => current.map((item) => (item.id === subcategory.id ? { ...item, active } : item)))
      toast.success(
        active ? `«${subcategory.name}» vuelve a estar activa.` : `«${subcategory.name}» quedó inactiva sin borrar sus obras.`,
        'Estado actualizado',
      )
      if (activeFilter !== '') setRefresh((value) => value + 1)
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudo cambiar el estado')
    } finally {
      setTogglingId(null)
    }
  }

  const columns: Array<Column<Subcategory>> = [
    {
      key: 'name',
      header: 'Subcategoría',
      width: '26%',
      render: (subcategory) => (
        <div className="category-cell">
          <span className="category-swatch category-swatch-sm" style={{ backgroundColor: subcategory.category?.color ?? '#8b8496' }} />
          <span>
            <strong>{subcategory.name}</strong>
            <small>/{subcategory.slug}</small>
          </span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Categoría principal',
      width: '20%',
      className: 'hide-sm',
      render: (subcategory) =>
        subcategory.category ? (
          <Link to={`/categorias`} className="category-link">
            <span className="bar-dot" style={{ backgroundColor: subcategory.category.color }} />
            {subcategory.category.name}
          </Link>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'description',
      header: 'Descripción',
      width: '28%',
      className: 'hide-lg',
      render: (subcategory) => (
        <span className="text-muted text-small">{subcategory.description ? truncate(subcategory.description, 80) : 'Sin descripción'}</span>
      ),
    },
    {
      key: 'artworks',
      header: 'Obras',
      width: '8%',
      className: 'hide-sm',
      render: (subcategory) => <span className="count-cell">{subcategory.artworkCount ?? 0}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      width: '12%',
      render: (subcategory) =>
        canWrite ? (
          <div className="status-cell">
            <Switch
              checked={subcategory.active}
              onChange={(next) => handleToggle(subcategory, next)}
              label={`${subcategory.active ? 'Desactivar' : 'Activar'} ${subcategory.name}`}
              disabled={togglingId === subcategory.id}
              size="sm"
            />
            <span className={`text-small ${subcategory.active ? 'text-success' : 'text-muted'}`}>
              {subcategory.active ? 'Activa' : 'Inactiva'}
            </span>
          </div>
        ) : (
          <ActiveBadge status={subcategory.active ? 'active' : 'inactive'} />
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '10%',
      align: 'right',
      render: (subcategory) =>
        canWrite ? (
          <div className="row-actions">
            <button type="button" className="icon-btn" onClick={() => openEdit(subcategory)} title="Editar subcategoría" aria-label={`Editar ${subcategory.name}`}>
              <IconEdit size={17} />
            </button>
            <button
              type="button"
              className="icon-btn icon-btn-danger"
              onClick={() => setDeleteTarget(subcategory)}
              title="Eliminar subcategoría"
              aria-label={`Eliminar ${subcategory.name}`}
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
        title="Subcategorías"
        description="Cada subcategoría vive dentro de una categoría principal. Desactivarla conserva las obras que la usan."
        actions={
          canWrite ? (
            <Button icon={<IconPlus size={18} />} onClick={openCreate}>
              Nueva subcategoría
            </Button>
          ) : undefined
        }
      />

      <section className="card filter-card" aria-label="Filtros de subcategorías">
        <div className="filter-row">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar subcategoría…" ariaLabel="Buscar subcategorías" />
          <div className="filter-controls">
            <label className="filter-field">
              <span>Categoría</span>
              <select className="input select" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">Todas</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
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
            <IconSubcategory size={15} />
            {loading ? 'Cargando…' : `${subcategories.length} ${subcategories.length === 1 ? 'subcategoría' : 'subcategorías'}`}
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
            rows={subcategories}
            rowKey={(subcategory) => subcategory.id}
            loading={loading}
            empty={
              <EmptyState
                icon={<IconSubcategory size={28} />}
                title={search || categoryFilter || activeFilter ? 'No hay subcategorías con estos filtros' : 'Todavía no hay subcategorías'}
                description={
                  search || categoryFilter || activeFilter
                    ? 'Ajusta la búsqueda o los filtros para encontrar lo que buscas.'
                    : 'Crea la primera subcategoría y vincúlala a una categoría principal.'
                }
                action={
                  canWrite && !search && !categoryFilter && !activeFilter ? (
                    <Button size="sm" icon={<IconPlus size={16} />} onClick={openCreate}>
                      Nueva subcategoría
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
        title={editing ? 'Editar subcategoría' : 'Nueva subcategoría'}
        description={editing ? 'Los cambios se reflejan en las obras asociadas.' : 'Vincula la nueva subcategoría a una categoría principal.'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="subcategory-form" loading={saving}>
              {editing ? 'Guardar cambios' : 'Crear subcategoría'}
            </Button>
          </>
        }
      >
        <form id="subcategory-form" onSubmit={submit} className="form-grid" noValidate>
          <Field label="Categoría principal" htmlFor="subcategory-category" required error={errors.categoryId} className="span-2">
            <Select
              id="subcategory-category"
              value={form.categoryId}
              invalid={Boolean(errors.categoryId)}
              onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
            >
              <option value="">Selecciona una categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}{category.active ? '' : ' (inactiva)'}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Nombre" htmlFor="subcategory-name" required error={errors.name}>
            <Input
              id="subcategory-name"
              value={form.name}
              invalid={Boolean(errors.name)}
              placeholder="Ej. Video instalación"
              maxLength={60}
              onChange={(event) => handleNameChange(event.target.value)}
            />
          </Field>

          <Field label="Slug" htmlFor="subcategory-slug" required error={errors.slug} hint="Identificador para las URLs públicas.">
            <Input
              id="subcategory-slug"
              value={form.slug}
              invalid={Boolean(errors.slug)}
              placeholder="ej-video-instalacion"
              maxLength={80}
              onChange={(event) => {
                setSlugTouched(true)
                setForm((current) => ({ ...current, slug: event.target.value.toLowerCase() }))
              }}
            />
          </Field>

          <Field label="Descripción" htmlFor="subcategory-description" className="span-2" hint="Máximo 300 caracteres.">
            <Textarea
              id="subcategory-description"
              rows={3}
              maxLength={300}
              value={form.description}
              placeholder="Describe brevemente esta subcategoría…"
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
            />
          </Field>

          <label className="checkbox-row span-2">
            <input
              type="checkbox"
              className="checkbox"
              checked={form.active}
              onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))}
            />
            <span>
              <strong>Subcategoría activa</strong>
              <small>Si la desactivas, no se podrá asignar a nuevas obras, pero se conserva todo su historial.</small>
            </span>
          </label>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Eliminar subcategoría"
        description={
          deleteTarget
            ? `Solo es posible eliminar «${deleteTarget.name}» si no tiene obras asociadas. Si ya tiene contenido, desactívala para conservar el historial.`
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
