import type {
  Artist,
  ArtistInput,
  ArtistType,
  Artwork,
  ArtworkInput,
  Category,
  CategoryInput,
  DashboardStats,
  MediaFile,
  MediaKind,
  PublishStatus,
  Subcategory,
  SubcategoryInput,
} from '../../types'
import { currentYear } from '../../utils/format'
import { readAsDataUrl, FILE_RULES } from '../../utils/files'
import { isEmail, isSlug, isYearInRange } from '../../utils/validators'
import { ApiError } from '../errors'
import { getToken, loadSession, saveSession } from '../session'
import { DEMO_USERS, graduateArtist, loadDb, newId, persistDb, type Database } from './db'

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function json<T>(init: RequestInit): T {
  if (!init.body) return {} as T
  try {
    return JSON.parse(String(init.body)) as T
  } catch {
    throw new ApiError('El cuerpo de la solicitud no es un JSON válido.', 400)
  }
}

function fail(status: number, message: string, fields?: Record<string, string>): never {
  throw new ApiError(message, status, fields)
}

function hydrateArtwork(work: Artwork, db: Database): Artwork {
  const artist = db.artists.find((item) => item.id === work.artistId)
  const category = db.categories.find((item) => item.id === work.categoryId)
  const subcategory = db.subcategories.find((item) => item.id === work.subcategoryId)
  return {
    ...work,
    artist: artist
      ? { id: artist.id, firstName: artist.firstName, lastName: artist.lastName, type: artist.type, program: artist.program }
      : undefined,
    category: category ? { id: category.id, name: category.name, color: category.color } : undefined,
    subcategory: subcategory ? { id: subcategory.id, name: subcategory.name } : undefined,
  }
}

function uniqueSlug(db: Database, collection: Array<{ id: string; slug: string }>, value: string, ignoreId?: string): string {
  const base = value || 'sin-titulo'
  let candidate = base
  let counter = 1
  while (collection.some((item) => item.slug === candidate && item.id !== ignoreId)) {
    counter += 1
    candidate = `${base}-${counter}`
  }
  return candidate
}

function validateArtwork(db: Database, input: ArtworkInput): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!input.title?.trim()) fields.title = 'El título es obligatorio.'
  if (!input.description || input.description.trim().length < 20) {
    fields.description = 'La descripción debe tener al menos 20 caracteres.'
  }
  if (!input.technique?.trim()) fields.technique = 'La técnica es obligatoria.'
  if (!input.dimensions?.trim()) fields.dimensions = 'Las dimensiones son obligatorias.'
  if (!isYearInRange(Number(input.year))) fields.year = 'Ingresa un año válido.'

  const category = db.categories.find((item) => item.id === input.categoryId)
  if (!category) fields.categoryId = 'Selecciona una categoría válida.'
  const subcategory = db.subcategories.find((item) => item.id === input.subcategoryId)
  if (!subcategory) {
    fields.subcategoryId = 'Selecciona una subcategoría válida.'
  } else if (category && subcategory.categoryId !== category.id) {
    fields.subcategoryId = 'La subcategoría no pertenece a la categoría seleccionada.'
  }
  if (!db.artists.some((item) => item.id === input.artistId)) fields.artistId = 'Selecciona un artista válido.'
  return fields
}

function sortByDate<T extends { updatedAt?: string; createdAt: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
}

export async function mockRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await delay(140 + Math.random() * 180)

  const method = (init.method ?? 'GET').toUpperCase()
  const url = new URL(path, 'http://mock.local')
  const route = url.pathname
  const query = url.searchParams
  const db = loadDb()

  // ── Autenticación ─────────────────────────────────────────────────────────
  if (route === '/auth/login' && method === 'POST') {
    const { email, password } = json<{ email: string; password: string }>(init)
    const found = DEMO_USERS.find(
      (item) => item.email.toLowerCase() === String(email ?? '').trim().toLowerCase() && item.password === password,
    )
    if (!found) fail(401, 'Correo o contraseña incorrectos. Revisa tus credenciales.')
    const session = { token: `demo-token-${found.user.id}-${Date.now()}`, user: found.user }
    saveSession(session)
    return { token: session.token, user: found.user } as T
  }

  if (!getToken()) {
    fail(401, 'Tu sesión expiró. Inicia sesión nuevamente.')
  }

  const session = loadSession()

  if (route === '/auth/me' && method === 'GET') {
    if (!session) fail(401, 'Tu sesión expiró. Inicia sesión nuevamente.')
    return session.user as T
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  if (route === '/dashboard/stats' && method === 'GET') {
    const byCategory = db.categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        color: category.color,
        count: db.artworks.filter((work) => work.categoryId === category.id).length,
      }))
      .sort((a, b) => b.count - a.count)

    const stats: DashboardStats = {
      artworks: {
        total: db.artworks.length,
        published: db.artworks.filter((work) => work.status === 'published').length,
        draft: db.artworks.filter((work) => work.status === 'draft').length,
        archived: db.artworks.filter((work) => work.status === 'archived').length,
        sold: db.artworks.filter((work) => work.sold).length,
      },
      artists: {
        total: db.artists.length,
        students: db.artists.filter((artist) => artist.type === 'student').length,
        graduates: db.artists.filter((artist) => artist.type === 'graduate').length,
        inactive: db.artists.filter((artist) => artist.status === 'inactive').length,
      },
      categories: {
        total: db.categories.length,
        active: db.categories.filter((category) => category.active).length,
        subcategories: db.subcategories.length,
      },
      byCategory,
      recent: sortByDate(db.artworks).slice(0, 5).map((work) => hydrateArtwork(work, db)),
    }
    return stats as T
  }

  // ── Obras ─────────────────────────────────────────────────────────────────
  if (route === '/artworks' && method === 'GET') {
    const search = (query.get('search') ?? '').trim().toLowerCase()
    const status = query.get('status') ?? ''
    const categoryId = query.get('categoryId') ?? ''
    const subcategoryId = query.get('subcategoryId') ?? ''
    const artistId = query.get('artistId') ?? ''
    const sold = query.get('sold')
    const page = Math.max(1, Number(query.get('page') ?? 1) || 1)
    const limit = Math.min(100, Math.max(1, Number(query.get('limit') ?? 10) || 10))

    let items = db.artworks.filter((work) => {
      const artist = db.artists.find((item) => item.id === work.artistId)
      const matchesSearch =
        !search ||
        work.title.toLowerCase().includes(search) ||
        work.description.toLowerCase().includes(search) ||
        work.technique.toLowerCase().includes(search) ||
        `${artist?.firstName ?? ''} ${artist?.lastName ?? ''}`.toLowerCase().includes(search)
      return (
        matchesSearch &&
        (!status || work.status === status) &&
        (!categoryId || work.categoryId === categoryId) &&
        (!subcategoryId || work.subcategoryId === subcategoryId) &&
        (!artistId || work.artistId === artistId) &&
        (sold === null || work.sold === (sold === 'true'))
      )
    })

    items = sortByDate(items)
    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const data = items.slice((safePage - 1) * limit, safePage * limit).map((work) => hydrateArtwork(work, db))
    return { data, meta: { page: safePage, limit, total, totalPages } } as T
  }

  if (route === '/artworks' && method === 'POST') {
    const input = json<ArtworkInput>(init)
    const fields = validateArtwork(db, input)
    if (Object.keys(fields).length) fail(422, 'Revisa los campos obligatorios de la obra.', fields)

    const now = new Date().toISOString()
    const work: Artwork = {
      id: newId('work'),
      title: input.title.trim(),
      slug: uniqueSlug(db, db.artworks, input.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')),
      description: input.description.trim(),
      year: Number(input.year),
      technique: input.technique.trim(),
      dimensions: input.dimensions.trim(),
      categoryId: input.categoryId,
      subcategoryId: input.subcategoryId,
      artistId: input.artistId,
      status: input.status,
      sold: Boolean(input.sold),
      featured: Boolean(input.featured),
      coverUrl: input.coverUrl || input.media.find((item) => item.kind === 'image')?.url,
      media: input.media ?? [],
      createdAt: now,
      updatedAt: now,
    }
    db.artworks.unshift(work)
    persistDb(db)
    return hydrateArtwork(work, db) as T
  }

  const artworkFilesMatch = route.match(/^\/artworks\/([^/]+)\/files$/)
  if (artworkFilesMatch && method === 'POST') {
    const work = db.artworks.find((item) => item.id === artworkFilesMatch[1])
    if (!work) fail(404, 'La obra no existe.')
    if (!(init.body instanceof FormData)) fail(400, 'Los archivos deben enviarse como multipart/form-data.')

    const kind = String(init.body.get('kind') ?? 'image') as MediaKind
    const rule = FILE_RULES[kind]
    if (!rule) fail(422, 'Tipo de archivo no soportado.')
    const files = init.body.getAll('files').filter((item): item is File => item instanceof File)
    if (!files.length) fail(422, 'No se recibió ningún archivo.')
    if (work!.media.filter((item) => item.kind === kind).length + files.length > rule.max) {
      fail(422, `Puedes adjuntar hasta ${rule.max} archivos de este tipo.`)
    }

    const uploaded: MediaFile[] = []
    for (const file of files) {
      if (!rule.accept.includes(file.type)) fail(422, `El archivo «${file.name}» no tiene un formato permitido.`)
      if (file.size > rule.maxMB * 1024 * 1024) fail(422, `El archivo «${file.name}» supera ${rule.maxMB} MB.`)
      uploaded.push({
        id: newId('media'),
        name: file.name,
        type: file.type,
        size: file.size,
        kind,
        url: await readAsDataUrl(file),
      })
    }

    work!.media = [...work!.media, ...uploaded]
    if (!work!.coverUrl) work!.coverUrl = uploaded.find((item) => item.kind === 'image')?.url
    work!.updatedAt = new Date().toISOString()
    persistDb(db)
    return hydrateArtwork(work!, db) as T
  }

  const artworkMatch = route.match(/^\/artworks\/([^/]+)$/)
  if (artworkMatch) {
    const index = db.artworks.findIndex((item) => item.id === artworkMatch[1])
    if (index < 0) fail(404, 'La obra solicitada no existe.')

    if (method === 'GET') return hydrateArtwork(db.artworks[index], db) as T

    if (method === 'PUT') {
      const input = json<ArtworkInput>(init)
      const fields = validateArtwork(db, input)
      if (Object.keys(fields).length) fail(422, 'Revisa los campos obligatorios de la obra.', fields)
      const updated: Artwork = {
        ...db.artworks[index],
        title: input.title.trim(),
        description: input.description.trim(),
        year: Number(input.year),
        technique: input.technique.trim(),
        dimensions: input.dimensions.trim(),
        categoryId: input.categoryId,
        subcategoryId: input.subcategoryId,
        artistId: input.artistId,
        status: input.status,
        sold: Boolean(input.sold),
        featured: Boolean(input.featured),
        coverUrl: input.coverUrl ?? db.artworks[index].coverUrl,
        media: input.media ?? db.artworks[index].media,
        updatedAt: new Date().toISOString(),
      }
      db.artworks[index] = updated
      persistDb(db)
      return hydrateArtwork(updated, db) as T
    }

    if (method === 'DELETE') {
      db.artworks.splice(index, 1)
      persistDb(db)
      return { id: artworkMatch[1] } as T
    }
  }

  const artworkStatusMatch = route.match(/^\/artworks\/([^/]+)\/status$/)
  if (artworkStatusMatch && method === 'PATCH') {
    const { status } = json<{ status: PublishStatus }>(init)
    if (!['draft', 'published', 'archived'].includes(status)) fail(422, 'Estado de publicación inválido.')
    const work = db.artworks.find((item) => item.id === artworkStatusMatch[1])
    if (!work) fail(404, 'La obra solicitada no existe.')
    work!.status = status
    work!.updatedAt = new Date().toISOString()
    persistDb(db)
    return hydrateArtwork(work!, db) as T
  }

  // ── Categorías ────────────────────────────────────────────────────────────
  if (route === '/categories') {
    if (method === 'GET') {
      const search = (query.get('search') ?? '').trim().toLowerCase()
      const active = query.get('active')
      const items = db.categories
        .filter(
          (category) =>
            (!search || category.name.toLowerCase().includes(search) || category.description.toLowerCase().includes(search)) &&
            (active === null || category.active === (active === 'true')),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map((category) => ({
          ...category,
          subcategoryCount: db.subcategories.filter((item) => item.categoryId === category.id).length,
          artworkCount: db.artworks.filter((item) => item.categoryId === category.id).length,
        }))
      return items as T
    }

    if (method === 'POST') {
      const input = json<CategoryInput>(init)
      const name = input.name?.trim()
      const slug = input.slug?.trim() || name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const fields: Record<string, string> = {}
      if (!name) fields.name = 'El nombre es obligatorio.'
      if (!slug || !isSlug(slug)) fields.slug = 'Usa un slug con minúsculas, números y guiones.'
      if (db.categories.some((item) => item.slug === slug)) fields.slug = 'Ya existe una categoría con este slug.'
      if (Object.keys(fields).length) fail(422, 'Revisa los datos de la categoría.', fields)

      const category: Category = {
        id: newId('cat'),
        name: name!,
        slug: slug!,
        description: input.description?.trim() ?? '',
        color: input.color || '#6b7280',
        active: input.active ?? true,
        createdAt: new Date().toISOString(),
      }
      db.categories.push(category)
      persistDb(db)
      return { ...category, subcategoryCount: 0, artworkCount: 0 } as T
    }
  }

  const categoryMatch = route.match(/^\/categories\/([^/]+)$/)
  if (categoryMatch) {
    const index = db.categories.findIndex((item) => item.id === categoryMatch[1])
    if (index < 0) fail(404, 'La categoría no existe.')

    if (method === 'PUT') {
      const input = json<CategoryInput>(init)
      const name = input.name?.trim()
      const slug = input.slug?.trim()
      const fields: Record<string, string> = {}
      if (!name) fields.name = 'El nombre es obligatorio.'
      if (!slug || !isSlug(slug)) fields.slug = 'Usa un slug con minúsculas, números y guiones.'
      if (db.categories.some((item) => item.slug === slug && item.id !== categoryMatch[1])) fields.slug = 'Ya existe una categoría con este slug.'
      if (Object.keys(fields).length) fail(422, 'Revisa los datos de la categoría.', fields)

      const updated: Category = {
        ...db.categories[index],
        name: name!,
        slug: slug!,
        description: input.description?.trim() ?? '',
        color: input.color || db.categories[index].color,
        active: input.active ?? db.categories[index].active,
      }
      db.categories[index] = updated
      persistDb(db)
      return {
        ...updated,
        subcategoryCount: db.subcategories.filter((item) => item.categoryId === updated.id).length,
        artworkCount: db.artworks.filter((item) => item.categoryId === updated.id).length,
      } as T
    }

    if (method === 'DELETE') {
      const id = categoryMatch[1]
      if (db.subcategories.some((item) => item.categoryId === id) || db.artworks.some((item) => item.categoryId === id)) {
        fail(409, 'No se puede eliminar: la categoría tiene subcategorías u obras asociadas. Desactívala para conservar el historial.')
      }
      db.categories.splice(index, 1)
      persistDb(db)
      return { id } as T
    }
  }

  const categoryStatusMatch = route.match(/^\/categories\/([^/]+)\/status$/)
  if (categoryStatusMatch && method === 'PATCH') {
    const { active } = json<{ active: boolean }>(init)
    const category = db.categories.find((item) => item.id === categoryStatusMatch[1])
    if (!category) fail(404, 'La categoría no existe.')
    category!.active = Boolean(active)
    persistDb(db)
    return { ...category } as T
  }

  // ── Subcategorías ────────────────────────────────────────────────────────
  if (route === '/subcategories') {
    if (method === 'GET') {
      const search = (query.get('search') ?? '').trim().toLowerCase()
      const categoryId = query.get('categoryId') ?? ''
      const active = query.get('active')
      const items = db.subcategories
        .filter(
          (item) =>
            (!search || item.name.toLowerCase().includes(search) || item.description.toLowerCase().includes(search)) &&
            (!categoryId || item.categoryId === categoryId) &&
            (active === null || item.active === (active === 'true')),
        )
        .sort((a, b) => a.name.localeCompare(b.name, 'es'))
        .map((item) => {
          const category = db.categories.find((cat) => cat.id === item.categoryId)
          return {
            ...item,
            artworkCount: db.artworks.filter((work) => work.subcategoryId === item.id).length,
            category: category ? { id: category.id, name: category.name, color: category.color } : undefined,
          }
        })
      return items as T
    }

    if (method === 'POST') {
      const input = json<SubcategoryInput>(init)
      const name = input.name?.trim()
      const slug = input.slug?.trim() || name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const fields: Record<string, string> = {}
      if (!input.categoryId || !db.categories.some((item) => item.id === input.categoryId)) {
        fields.categoryId = 'Selecciona una categoría válida.'
      }
      if (!name) fields.name = 'El nombre es obligatorio.'
      if (!slug || !isSlug(slug)) fields.slug = 'Usa un slug con minúsculas, números y guiones.'
      if (db.subcategories.some((item) => item.slug === slug)) fields.slug = 'Ya existe una subcategoría con este slug.'
      if (Object.keys(fields).length) fail(422, 'Revisa los datos de la subcategoría.', fields)

      const subcategory: Subcategory = {
        id: newId('sub'),
        categoryId: input.categoryId,
        name: name!,
        slug: slug!,
        description: input.description?.trim() ?? '',
        active: input.active ?? true,
        createdAt: new Date().toISOString(),
      }
      db.subcategories.push(subcategory)
      persistDb(db)
      return { ...subcategory, artworkCount: 0 } as T
    }
  }

  const subcategoryMatch = route.match(/^\/subcategories\/([^/]+)$/)
  if (subcategoryMatch) {
    const index = db.subcategories.findIndex((item) => item.id === subcategoryMatch[1])
    if (index < 0) fail(404, 'La subcategoría no existe.')

    if (method === 'PUT') {
      const input = json<SubcategoryInput>(init)
      const name = input.name?.trim()
      const slug = input.slug?.trim()
      const fields: Record<string, string> = {}
      if (!input.categoryId || !db.categories.some((item) => item.id === input.categoryId)) {
        fields.categoryId = 'Selecciona una categoría válida.'
      }
      if (!name) fields.name = 'El nombre es obligatorio.'
      if (!slug || !isSlug(slug)) fields.slug = 'Usa un slug con minúsculas, números y guiones.'
      if (db.subcategories.some((item) => item.slug === slug && item.id !== subcategoryMatch[1])) fields.slug = 'Ya existe una subcategoría con este slug.'
      if (Object.keys(fields).length) fail(422, 'Revisa los datos de la subcategoría.', fields)

      const updated: Subcategory = {
        ...db.subcategories[index],
        categoryId: input.categoryId,
        name: name!,
        slug: slug!,
        description: input.description?.trim() ?? '',
        active: input.active ?? db.subcategories[index].active,
      }
      db.subcategories[index] = updated
      const category = db.categories.find((item) => item.id === updated.categoryId)
      persistDb(db)
      return {
        ...updated,
        artworkCount: db.artworks.filter((work) => work.subcategoryId === updated.id).length,
        category: category ? { id: category.id, name: category.name, color: category.color } : undefined,
      } as T
    }

    if (method === 'DELETE') {
      const id = subcategoryMatch[1]
      if (db.artworks.some((item) => item.subcategoryId === id)) {
        fail(409, 'No se puede eliminar: la subcategoría tiene obras asociadas. Desactívala para conservar el historial.')
      }
      db.subcategories.splice(index, 1)
      persistDb(db)
      return { id } as T
    }
  }

  const subcategoryStatusMatch = route.match(/^\/subcategories\/([^/]+)\/status$/)
  if (subcategoryStatusMatch && method === 'PATCH') {
    const { active } = json<{ active: boolean }>(init)
    const subcategory = db.subcategories.find((item) => item.id === subcategoryStatusMatch[1])
    if (!subcategory) fail(404, 'La subcategoría no existe.')
    subcategory!.active = Boolean(active)
    persistDb(db)
    return { ...subcategory } as T
  }

  // ── Artistas ─────────────────────────────────────────────────────────────
  if (route === '/artists' && method === 'GET') {
    const search = (query.get('search') ?? '').trim().toLowerCase()
    const type = query.get('type') ?? ''
    const status = query.get('status') ?? ''
    const page = Math.max(1, Number(query.get('page') ?? 1) || 1)
    const limit = Math.min(200, Math.max(1, Number(query.get('limit') ?? 10) || 10))

    let items = db.artists.filter((artist) => {
      const fullName = `${artist.firstName} ${artist.lastName}`.toLowerCase()
      return (
        (!search || fullName.includes(search) || artist.email.toLowerCase().includes(search) || artist.document.includes(search)) &&
        (!type || artist.type === type) &&
        (!status || artist.status === status)
      )
    })
    items = [...items].sort((a, b) => a.lastName.localeCompare(b.lastName, 'es'))

    const total = items.length
    const totalPages = Math.max(1, Math.ceil(total / limit))
    const safePage = Math.min(page, totalPages)
    const data = items.slice((safePage - 1) * limit, safePage * limit).map((artist) => ({
      ...artist,
      artworkCount: db.artworks.filter((work) => work.artistId === artist.id).length,
    }))
    return { data, meta: { page: safePage, limit, total, totalPages } } as T
  }

  if (route === '/artists' && method === 'POST') {
    const input = json<ArtistInput>(init)
    const fields = validateArtist(input, db)
    if (Object.keys(fields).length) fail(422, 'Revisa los datos del artista.', fields)
    const artist: Artist = {
      id: newId('artist'),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      phone: input.phone?.trim() ?? '',
      document: input.document?.trim() ?? '',
      program: input.program.trim(),
      type: input.type,
      status: input.status ?? 'active',
      startYear: Number(input.startYear),
      endYear: input.type === 'graduate' ? Number(input.endYear) : undefined,
      bio: input.bio?.trim() ?? '',
      createdAt: new Date().toISOString(),
    }
    db.artists.push(artist)
    persistDb(db)
    return { ...artist, artworkCount: 0 } as T
  }

  const graduateMatch = route.match(/^\/artists\/([^/]+)\/graduate$/)
  if (graduateMatch && method === 'PATCH') {
    const artist = db.artists.find((item) => item.id === graduateMatch[1])
    if (!artist) fail(404, 'El artista no existe.')
    if (artist!.type === 'graduate') fail(409, 'Este artista ya está registrado como graduado.')
    const body = json<{ endYear?: number }>(init)
    const updated = graduateArtist(artist!, body.endYear ? Number(body.endYear) : undefined)
    const index = db.artists.findIndex((item) => item.id === artist!.id)
    db.artists[index] = updated
    persistDb(db)
    return { ...updated, artworkCount: db.artworks.filter((work) => work.artistId === updated.id).length } as T
  }

  const artistStatusMatch = route.match(/^\/artists\/([^/]+)\/status$/)
  if (artistStatusMatch && method === 'PATCH') {
    const { status } = json<{ status: 'active' | 'inactive' }>(init)
    if (!['active', 'inactive'].includes(status)) fail(422, 'Estado inválido.')
    const artist = db.artists.find((item) => item.id === artistStatusMatch[1])
    if (!artist) fail(404, 'El artista no existe.')
    artist!.status = status
    persistDb(db)
    return { ...artist } as T
  }

  const artistMatch = route.match(/^\/artists\/([^/]+)$/)
  if (artistMatch) {
    const index = db.artists.findIndex((item) => item.id === artistMatch[1])
    if (index < 0) fail(404, 'El artista no existe.')

    if (method === 'GET') {
      return { ...db.artists[index], artworkCount: db.artworks.filter((work) => work.artistId === artistMatch[1]).length } as T
    }

    if (method === 'PUT') {
      const input = json<ArtistInput>(init)
      const fields = validateArtist(input, db, artistMatch[1])
      if (Object.keys(fields).length) fail(422, 'Revisa los datos del artista.', fields)
      const updated: Artist = {
        ...db.artists[index],
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        email: input.email.trim().toLowerCase(),
        phone: input.phone?.trim() ?? '',
        document: input.document?.trim() ?? '',
        program: input.program.trim(),
        type: input.type,
        status: input.status ?? db.artists[index].status,
        startYear: Number(input.startYear),
        endYear: input.type === 'graduate' ? Number(input.endYear) : undefined,
        bio: input.bio?.trim() ?? '',
      }
      db.artists[index] = updated
      persistDb(db)
      return {
        ...updated,
        artworkCount: db.artworks.filter((work) => work.artistId === updated.id).length,
      } as T
    }

    if (method === 'DELETE') {
      const id = artistMatch[1]
      if (db.artworks.some((item) => item.artistId === id)) {
        fail(409, 'No se puede eliminar: el artista tiene obras asociadas. Desactívalo para conservar su historial.')
      }
      db.artists.splice(index, 1)
      persistDb(db)
      return { id } as T
    }
  }

  fail(404, `No se encontró el recurso solicitado (${method} ${route}).`)
}

function validateArtist(input: ArtistInput, db: Database, ignoreId?: string): Record<string, string> {
  const fields: Record<string, string> = {}
  if (!input.firstName?.trim()) fields.firstName = 'Los nombres son obligatorios.'
  if (!input.lastName?.trim()) fields.lastName = 'Los apellidos son obligatorios.'
  if (!input.email?.trim() || !isEmail(input.email)) fields.email = 'Ingresa un correo electrónico válido.'
  else if (db.artists.some((artist) => artist.email.toLowerCase() === input.email.trim().toLowerCase() && artist.id !== ignoreId)) {
    fields.email = 'Ya existe un artista registrado con este correo.'
  }
  if (!input.program?.trim()) fields.program = 'El programa académico es obligatorio.'
  if (!['student', 'graduate'].includes(input.type)) fields.type = 'Selecciona el tipo de artista.'
  if (!isYearInRange(Number(input.startYear), 1950)) fields.startYear = 'Ingresa un año de ingreso válido.'
  if (input.type === 'graduate') {
    if (!isYearInRange(Number(input.endYear), 1950)) {
      fields.endYear = 'Ingresa un año de graduación válido.'
    } else if (Number(input.endYear) < Number(input.startYear)) {
      fields.endYear = 'El año de graduación no puede ser anterior al de ingreso.'
    }
  }
  if (input.document && db.artists.some((artist) => artist.document === input.document.trim() && artist.id !== ignoreId)) {
    fields.document = 'Ya existe un artista con este documento.'
  }
  return fields
}

export type { ArtistType, MediaKind, PublishStatus }
