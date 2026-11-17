import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../../api/errors'
import { USE_MOCK } from '../../api/client'
import { artistsApi, artworksApi, categoriesApi, subcategoriesApi } from '../../api/services'
import { useAuth } from '../../auth/AuthContext'
import { useToast } from '../../components/ToastProvider'
import { MediaUploader } from '../../components/forms/MediaUploader'
import { Button } from '../../components/ui/Button'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback'
import { Field, Input, Select, Textarea } from '../../components/ui/Field'
import { PageHeader } from '../../components/ui/PageHeader'
import { IconAlert, IconArrowLeft, IconArtwork, IconCheck, IconSave, IconSparkle, IconStar } from '../../components/icons'
import type { Artist, ArtworkInput, Category, MediaFile, MediaKind, PublishStatus, Subcategory } from '../../types'
import { compressImage, validateFiles } from '../../utils/files'
import { artistName, currentYear } from '../../utils/format'
import { isYearInRange } from '../../utils/validators'

const YEAR_NOW = currentYear()

const EMPTY_FORM: ArtworkInput = {
  title: '',
  description: '',
  year: YEAR_NOW,
  technique: '',
  dimensions: '',
  categoryId: '',
  subcategoryId: '',
  artistId: '',
  status: 'draft',
  sold: false,
  featured: false,
  media: [],
}

const STATUS_OPTIONS: Array<{ value: PublishStatus; label: string; description: string }> = [
  { value: 'draft', label: 'Borrador', description: 'Solo visible en el panel administrativo.' },
  { value: 'published', label: 'Publicada', description: 'Visible en el repositorio público.' },
  { value: 'archived', label: 'Archivada', description: 'Fuera de circulación, conserva su historial.' },
]

interface ArtworkFormPageProps {
  mode: 'create' | 'edit'
}

export function ArtworkFormPage({ mode }: ArtworkFormPageProps) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { isAdmin, can } = useAuth()

  const [form, setForm] = useState<ArtworkInput>(EMPTY_FORM)
  const [coverId, setCoverId] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [mediaErrors, setMediaErrors] = useState<Record<MediaKind, string[]>>({ image: [], video: [], document: [] })
  const [categories, setCategories] = useState<Category[]>([])
  const [subcategories, setSubcategories] = useState<Subcategory[]>([])
  const [artists, setArtists] = useState<Artist[]>([])

  const [refsLoading, setRefsLoading] = useState(true)
  const [workLoading, setWorkLoading] = useState(mode === 'edit')
  const [loadError, setLoadError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadBusy, setUploadBusy] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setRefsLoading(true)
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
        if ((cause as Error).name !== 'AbortError') setLoadError(errorMessage(cause))
      })
      .finally(() => setRefsLoading(false))
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (mode !== 'edit' || !id) return
    const controller = new AbortController()
    setWorkLoading(true)
    setLoadError('')
    artworksApi
      .get(id, controller.signal)
      .then((work) => {
        setForm({
          title: work.title,
          description: work.description,
          year: work.year,
          technique: work.technique,
          dimensions: work.dimensions,
          categoryId: work.categoryId,
          subcategoryId: work.subcategoryId,
          artistId: work.artistId,
          status: work.status,
          sold: work.sold,
          featured: work.featured,
          coverUrl: work.coverUrl,
          media: work.media ?? [],
        })
        const images = (work.media ?? []).filter((item) => item.kind === 'image')
        const cover = images.find((item) => item.url && item.url === work.coverUrl) ?? images[0]
        setCoverId(cover?.id ?? null)
        setDirty(false)
      })
      .catch((cause) => {
        if ((cause as Error).name === 'AbortError') return
        if (cause instanceof ApiError && cause.status === 404) setNotFound(true)
        else setLoadError(errorMessage(cause))
      })
      .finally(() => setWorkLoading(false))
    return () => controller.abort()
  }, [mode, id])

  useEffect(() => {
    if (!dirty) return
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirty])

  const update = <K extends keyof ArtworkInput>(key: K, value: ArtworkInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => {
      if (!current[key]) return current
      const next = { ...current }
      delete next[key]
      return next
    })
    setDirty(true)
  }

  const subcategoryOptions = subcategories.filter((item) => item.categoryId === form.categoryId)
  const images = form.media.filter((item) => item.kind === 'image')
  const imageCount = images.length

  const handleAddMedia = async (kind: MediaKind, files: File[]) => {
    const currentCount = form.media.filter((item) => item.kind === kind).length
    const { valid, errors: validationErrors } = validateFiles(files, kind, currentCount)
    setMediaErrors((current) => ({ ...current, [kind]: validationErrors }))
    if (valid.length === 0) return

    setUploadBusy(true)
    try {
      const created: MediaFile[] = []
      for (const file of valid) {
        let url: string | undefined
        if (kind === 'image') url = await compressImage(file)
        created.push({
          id: `tmp-${crypto.randomUUID()}`,
          name: file.name,
          type: file.type,
          size: file.size,
          kind,
          url,
          file,
        })
      }
      setForm((current) => ({ ...current, media: [...current.media, ...created] }))
      if (kind === 'image') {
        setCoverId((current) => current ?? created[0]?.id ?? null)
      }
      setDirty(true)
      toast.success(
        `${created.length} ${created.length === 1 ? 'archivo agregado' : 'archivos agregados'}. Recuerda guardar los cambios.`,
        'Archivos listos',
      )
    } catch (cause) {
      toast.error(errorMessage(cause), 'No se pudieron procesar los archivos')
    } finally {
      setUploadBusy(false)
    }
  }

  const handleRemoveMedia = (mediaId: string) => {
    const remaining = form.media.filter((item) => item.id !== mediaId)
    setForm((current) => ({ ...current, media: remaining }))
    if (coverId === mediaId) {
      setCoverId(remaining.find((item) => item.kind === 'image')?.id ?? null)
    }
    setDirty(true)
  }

  const handleSetCover = (mediaId: string) => {
    setCoverId(mediaId)
    setDirty(true)
  }

  const validate = (): boolean => {
    const next: Record<string, string> = {}
    if (form.title.trim().length < 3) next.title = 'El título debe tener al menos 3 caracteres.'
    if (form.title.trim().length > 120) next.title = 'El título no puede superar 120 caracteres.'
    if (form.description.trim().length < 20) next.description = 'La descripción debe tener al menos 20 caracteres.'
    if (!isYearInRange(Number(form.year))) next.year = `Ingresa un año entre 1900 y ${YEAR_NOW}.`
    if (!form.technique.trim()) next.technique = 'Indica la técnica de la obra.'
    if (!form.dimensions.trim()) next.dimensions = 'Indica las dimensiones o duración.'
    if (!form.categoryId) next.categoryId = 'Selecciona una categoría.'
    if (!form.subcategoryId) next.subcategoryId = 'Selecciona una subcategoría.'
    if (!form.artistId) next.artistId = 'Selecciona el artista autor de la obra.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!validate()) {
      toast.error('Revisa los campos marcados antes de guardar.', 'Faltan datos obligatorios')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setSaving(true)
    try {
      const cover = images.find((item) => item.id === coverId) ?? images[0]
      const payload: ArtworkInput = {
        ...form,
        year: Number(form.year),
        coverUrl: cover?.url ?? form.coverUrl,
        media: form.media.map((item) => {
          const { file, ...rest } = item
          void file
          return USE_MOCK ? rest : item.file ? { ...rest, url: undefined } : rest
        }),
      }

      const saved = mode === 'edit' && id ? await artworksApi.update(id, payload) : await artworksApi.create(payload)

      if (!USE_MOCK) {
        const kinds: MediaKind[] = ['image', 'video', 'document']
        for (const kind of kinds) {
          const files = form.media
            .filter((item) => item.kind === kind && item.file)
            .map((item) => item.file)
            .filter((file): file is File => Boolean(file))
          if (files.length) await artworksApi.uploadFiles(saved.id, files, kind)
        }
      }

      setDirty(false)
      toast.success(
        mode === 'edit' ? 'Los cambios de la obra se guardaron correctamente.' : 'La obra quedó registrada en el repositorio.',
        mode === 'edit' ? 'Obra actualizada' : 'Obra creada',
      )
      navigate('/obras', { replace: true })
    } catch (cause) {
      if (cause instanceof ApiError && cause.fields) {
        setErrors(cause.fields)
        toast.error(cause.message, 'Revisa los datos de la obra')
      } else {
        toast.error(errorMessage(cause), 'No se pudo guardar la obra')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (dirty) setConfirmDiscard(true)
    else navigate('/obras')
  }

  if (notFound) {
    return (
      <EmptyState
        icon={<IconArtwork size={30} />}
        title="No encontramos esta obra"
        description="Puede que haya sido eliminada o que el enlace no sea correcto."
        action={
          <Link to="/obras" className="btn btn-primary btn-sm">
            <IconArrowLeft size={16} /> Volver a las obras
          </Link>
        }
      />
    )
  }

  if (refsLoading || workLoading) {
    return (
      <div className="card">
        <Spinner label={mode === 'edit' ? 'Cargando la obra' : 'Preparando el formulario'} />
      </div>
    )
  }

  if (loadError) {
    return <ErrorState message={loadError} onRetry={() => window.location.reload()} />
  }

  return (
    <div className="stack-lg">
      <Link to="/obras" className="back-link">
        <IconArrowLeft size={16} /> Volver a obras
      </Link>

      <PageHeader
        eyebrow="Contenido · Obras"
        title={mode === 'edit' ? 'Editar obra' : 'Nueva obra'}
        description={
          mode === 'edit'
            ? 'Actualiza la información, la clasificación y los archivos de la obra.'
            : 'Completa la ficha de la obra, clasifícala y adjunta sus archivos.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={handleCancel} disabled={saving}>
              Cancelar
            </Button>
            <Button type="submit" form="artwork-form" icon={<IconSave size={17} />} loading={saving}>
              {mode === 'edit' ? 'Guardar cambios' : 'Crear obra'}
            </Button>
          </>
        }
      />

      {Object.keys(errors).length > 0 && (
        <div className="alert alert-danger" role="alert">
          <IconAlert size={18} />
          <span>Hay campos que necesitan tu atención. Revisa las marcas en el formulario.</span>
        </div>
      )}

      <form id="artwork-form" onSubmit={submit} className="artwork-layout" noValidate>
        <div className="artwork-main">
          <section className="card form-card">
            <div className="form-card-head">
              <h2>Información de la obra</h2>
              <p>Datos generales que acompañan la pieza en el repositorio.</p>
            </div>

            <div className="form-grid">
              <Field label="Título de la obra" htmlFor="title" required error={errors.title} className="span-2">
                <Input
                  id="title"
                  value={form.title}
                  maxLength={120}
                  invalid={Boolean(errors.title)}
                  placeholder="Ej. Raíces de barro"
                  onChange={(event) => update('title', event.target.value)}
                />
              </Field>

              <Field
                label="Descripción"
                htmlFor="description"
                required
                error={errors.description}
                hint={`${form.description.length}/2000 caracteres · describe la obra, su proceso y su intención.`}
                className="span-2"
              >
                <Textarea
                  id="description"
                  rows={6}
                  maxLength={2000}
                  value={form.description}
                  invalid={Boolean(errors.description)}
                  placeholder="Cuenta qué hay detrás de la obra: materiales, proceso, concepto…"
                  onChange={(event) => update('description', event.target.value)}
                />
              </Field>

              <Field label="Año de creación" htmlFor="year" required error={errors.year}>
                <Input
                  id="year"
                  type="number"
                  min={1900}
                  max={YEAR_NOW}
                  value={form.year || ''}
                  invalid={Boolean(errors.year)}
                  onChange={(event) => update('year', event.target.value === '' ? 0 : Number(event.target.value))}
                />
              </Field>

              <Field label="Técnica" htmlFor="technique" required error={errors.technique}>
                <Input
                  id="technique"
                  value={form.technique}
                  invalid={Boolean(errors.technique)}
                  placeholder="Ej. Óleo sobre lino"
                  onChange={(event) => update('technique', event.target.value)}
                />
              </Field>

              <Field label="Dimensiones o duración" htmlFor="dimensions" required error={errors.dimensions}>
                <Input
                  id="dimensions"
                  value={form.dimensions}
                  invalid={Boolean(errors.dimensions)}
                  placeholder="Ej. 120 × 80 cm · 8:42 min"
                  onChange={(event) => update('dimensions', event.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="card form-card">
            <div className="form-card-head">
              <h2>Clasificación y autoría</h2>
              <p>Vincula la obra con su categoría, subcategoría y artista.</p>
            </div>

            <div className="form-grid">
              <Field label="Categoría" htmlFor="category" required error={errors.categoryId}>
                <Select
                  id="category"
                  value={form.categoryId}
                  invalid={Boolean(errors.categoryId)}
                  onChange={(event) => {
                    update('categoryId', event.target.value)
                    update('subcategoryId', '')
                  }}
                >
                  <option value="">Selecciona una categoría</option>
                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                      disabled={!category.active && category.id !== form.categoryId}
                    >
                      {category.name}{category.active ? '' : ' (inactiva)'}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field
                label="Subcategoría"
                htmlFor="subcategory"
                required
                error={errors.subcategoryId}
                hint={!form.categoryId ? 'Selecciona primero una categoría.' : undefined}
              >
                <Select
                  id="subcategory"
                  value={form.subcategoryId}
                  invalid={Boolean(errors.subcategoryId)}
                  disabled={!form.categoryId}
                  onChange={(event) => update('subcategoryId', event.target.value)}
                >
                  <option value="">{form.categoryId ? 'Selecciona una subcategoría' : 'Sin categoría seleccionada'}</option>
                  {subcategoryOptions.map((subcategory) => (
                    <option
                      key={subcategory.id}
                      value={subcategory.id}
                      disabled={!subcategory.active && subcategory.id !== form.subcategoryId}
                    >
                      {subcategory.name}{subcategory.active ? '' : ' (inactiva)'}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Artista autor" htmlFor="artist" required error={errors.artistId} className="span-2">
                <Select
                  id="artist"
                  value={form.artistId}
                  invalid={Boolean(errors.artistId)}
                  onChange={(event) => update('artistId', event.target.value)}
                >
                  <option value="">Selecciona el artista</option>
                  {artists.map((artist) => (
                    <option
                      key={artist.id}
                      value={artist.id}
                      disabled={artist.status === 'inactive' && artist.id !== form.artistId}
                    >
                      {artistName(artist)} — {artist.program}{artist.status === 'inactive' ? ' (inactivo)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {can('categories:write') && (
              <p className="form-card-note">
                <IconSparkle size={14} /> ¿Falta una categoría o artista?{' '}
                <Link to="/categorias">Gestiona las categorías</Link> o <Link to="/artistas">registra un artista</Link>.
              </p>
            )}
          </section>

          <section className="card form-card">
            <div className="form-card-head">
              <h2>Archivos multimedia</h2>
              <p>Imágenes, videos y documentos que acompañan la ficha pública de la obra.</p>
            </div>

            <MediaUploader
              kind="image"
              items={images}
              onAdd={(files) => handleAddMedia('image', files)}
              onRemove={handleRemoveMedia}
              onSetCover={handleSetCover}
              coverId={coverId}
              errors={mediaErrors.image}
              busy={uploadBusy}
            />
            <MediaUploader
              kind="video"
              items={form.media.filter((item) => item.kind === 'video')}
              onAdd={(files) => handleAddMedia('video', files)}
              onRemove={handleRemoveMedia}
              errors={mediaErrors.video}
              busy={uploadBusy}
            />
            <MediaUploader
              kind="document"
              items={form.media.filter((item) => item.kind === 'document')}
              onAdd={(files) => handleAddMedia('document', files)}
              onRemove={handleRemoveMedia}
              errors={mediaErrors.document}
              busy={uploadBusy}
            />

            <div className={imageCount > 0 ? 'media-tip media-tip-ok' : 'media-tip'}>
              {imageCount > 0 ? <IconCheck size={15} /> : <IconAlert size={15} />}
              <span>
                {imageCount > 0
                  ? `La obra tiene ${imageCount} ${imageCount === 1 ? 'imagen' : 'imágenes'}. La marcada con estrella será la portada en la galería.`
                  : 'Recomendamos agregar al menos una imagen para que la obra pueda lucirse en la galería pública.'}
              </span>
            </div>
          </section>
        </div>

        <aside className="artwork-side">
          <section className="card side-card">
            <div className="side-card-head">
              <h2>Publicación</h2>
              <p>Define la visibilidad de la obra.</p>
            </div>
            <div className="status-options">
              {STATUS_OPTIONS.map((option) => (
                <label key={option.value} className={`status-option${form.status === option.value ? ' status-option-active' : ''}`}>
                  <input
                    type="radio"
                    name="status"
                    value={option.value}
                    checked={form.status === option.value}
                    onChange={() => update('status', option.value)}
                  />
                  <span className={`status-option-dot status-dot-${option.value}`} />
                  <span className="status-option-copy">
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className="card side-card">
            <div className="side-card-head">
              <h2>Visibilidad</h2>
              <p>Opciones destacadas dentro del repositorio.</p>
            </div>

            <label className="toggle-row">
              <span>
                <strong>Obra destacada</strong>
                <small>Aparece en los bloques principales del sitio público.</small>
              </span>
              <input
                type="checkbox"
                className="checkbox"
                checked={form.featured}
                onChange={(event) => update('featured', event.target.checked)}
              />
            </label>

            {isAdmin ? (
              <label className="toggle-row">
                <span>
                  <strong>Obra vendida</strong>
                  <small>Solo el administrador puede cambiar el estado comercial.</small>
                </span>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.sold}
                  onChange={(event) => update('sold', event.target.checked)}
                />
              </label>
            ) : (
              <div className="toggle-row toggle-row-locked">
                <span>
                  <strong>Estado comercial</strong>
                  <small>Solo un administrador puede modificarlo.</small>
                </span>
                <span className="lock-badge">{form.sold ? 'Vendida' : 'No vendida'}</span>
              </div>
            )}
          </section>

          <section className="card side-card cover-card">
            <div className="side-card-head">
              <h2>Portada</h2>
              <p>Así se verá la obra en la galería.</p>
            </div>
            <div className="cover-preview">
              {images.find((item) => item.id === coverId)?.url || images[0]?.url ? (
                <img src={images.find((item) => item.id === coverId)?.url ?? images[0]?.url} alt="Portada de la obra" />
              ) : (
                <span>
                  <IconArtwork size={26} />
                  Sin imagen de portada
                </span>
              )}
            </div>
            {images.length > 1 && (
              <p className="cover-hint">
                <IconStar size={14} /> Usa la estrella de cada imagen para elegir otra portada.
              </p>
            )}
          </section>

          <div className="side-actions">
            <Button type="submit" form="artwork-form" icon={<IconSave size={17} />} loading={saving} className="btn-block">
              {mode === 'edit' ? 'Guardar cambios' : 'Crear obra'}
            </Button>
            <Button variant="secondary" onClick={handleCancel} disabled={saving} className="btn-block">
              Cancelar
            </Button>
          </div>
        </aside>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        title="Descartar cambios"
        description="Si sales ahora, los cambios que no hayas guardado se perderán."
        confirmLabel="Sí, descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmDiscard(false)
          setDirty(false)
          navigate('/obras')
        }}
        onClose={() => setConfirmDiscard(false)}
      />
    </div>
  )
}
