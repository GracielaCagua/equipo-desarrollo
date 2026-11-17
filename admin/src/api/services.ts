import type {
  Artist,
  ArtistFilters,
  ArtistInput,
  ArtistType,
  ActiveStatus,
  Artwork,
  ArtworkFilters,
  ArtworkInput,
  Category,
  CategoryInput,
  DashboardStats,
  MediaKind,
  Paginated,
  PublishStatus,
  Session,
  Subcategory,
  SubcategoryInput,
} from '../types'
import { request } from './client'

function qs(params: Record<string, string | number | boolean | undefined | null>): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const result = search.toString()
  return result ? `?${result}` : ''
}

export const authApi = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: { email, password } }),
  register: (fullName: string, email: string, password: string) =>
    request<Session>('/auth/register', { method: 'POST', body: { full_name: fullName, email, password } }),
  me: () => request<Session['user']>('/auth/me'),
}

export const usersApi = {
  list: () => request<import('../types').AdminUser[]>('/admin-users'),
  update: (id: number, input: { full_name: string; email: string; role: 'superadmin' | 'admin' | 'editor' }) =>
    request<import('../types').AdminUser>(`/admin-users/${id}`, { method: 'PUT', body: input }),
  setStatus: (id: number, is_active: boolean) =>
    request<import('../types').AdminUser>(`/admin-users/${id}/status`, { method: 'PATCH', body: { is_active } }),
}

export const dashboardApi = {
  stats: (signal?: AbortSignal) => request<DashboardStats>('/dashboard/stats', { signal }),
}

export const artworksApi = {
  list: (filters: ArtworkFilters = {}, signal?: AbortSignal) =>
    request<{ data: Array<Record<string, unknown>>; meta: { page: number; limit: number; total: number; totalPages: number } }>(
      `/artworks${qs({
        search: filters.search,
        publication_status: filters.status,
        category_id: filters.categoryId,
        subcategory_id: filters.subcategoryId,
        artist_id: filters.artistId,
        is_sold: filters.sold,
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
      })}`,
      { signal },
    ).then((response) => {
      const mapArtwork = (row: Record<string, unknown>): Artwork => {
        const artistNameValue = String(row.artist_name ?? '')
        const nameParts = artistNameValue.trim().split(/\s+/)
        const files = Array.isArray(row.files) ? row.files as Array<Record<string, unknown>> : []
        const cover = files.find((file) => file.file_type === 'image')
        return {
          id: String(row.id),
          title: String(row.title ?? ''),
          slug: '',
          description: String(row.description ?? ''),
          year: Number(row.year ?? (new Date(String(row.created_at ?? '')).getFullYear() || new Date().getFullYear())),
          technique: String(row.technique ?? ''),
          dimensions: String(row.dimensions ?? ''),
          categoryId: String(row.category_id ?? ''),
          subcategoryId: String(row.subcategory_id ?? ''),
          artistId: String(row.artist_id ?? ''),
          status: (row.publication_status ?? 'draft') as PublishStatus,
          sold: row.commercial_status === 'sold' || row.is_sold === true,
          featured: false,
          coverUrl: typeof cover?.url === 'string' ? cover.url : undefined,
          media: files.map((file) => ({
            id: String(file.id),
            name: String(file.original_name ?? ''),
            type: String(file.extension ?? ''),
            size: Number(file.size_bytes ?? 0),
            kind: (file.file_type === 'model3d' ? 'document' : String(file.file_type ?? 'document')) as MediaKind,
            url: typeof file.url === 'string' ? file.url : undefined,
          })),
          createdAt: String(row.created_at ?? ''),
          updatedAt: String(row.updated_at ?? row.created_at ?? ''),
          artist: artistNameValue ? {
            id: String(row.artist_id ?? ''),
            firstName: nameParts[0] ?? '',
            lastName: nameParts.slice(1).join(' '),
            type: row.academic_status === 'graduate' ? 'graduate' : 'student',
            program: '',
          } : undefined,
          category: row.category_name ? {
            id: String(row.category_id ?? ''),
            name: String(row.category_name),
            color: '#6d4b8f',
          } : undefined,
          subcategory: row.subcategory_name ? {
            id: String(row.subcategory_id ?? ''),
            name: String(row.subcategory_name),
          } : undefined,
        }
      }
      return { data: response.data.map(mapArtwork), meta: response.meta }
    }),
  get: (id: string, signal?: AbortSignal) =>
    request<Record<string, unknown>>(`/artworks/${id}`, { signal }).then((row) => {
      const artistNameValue = String(row.artist_name ?? '')
      const nameParts = artistNameValue.trim().split(/\s+/)
      return {
        id: String(row.id),
        title: String(row.title ?? ''),
        slug: '',
        description: String(row.description ?? ''),
        year: Number(row.year ?? (new Date(String(row.created_at ?? '')).getFullYear() || new Date().getFullYear())),
        technique: String(row.technique ?? ''),
        dimensions: String(row.dimensions ?? ''),
        categoryId: String(row.category_id ?? ''),
        subcategoryId: String(row.subcategory_id ?? ''),
        artistId: String(row.artist_id ?? ''),
        status: (row.publication_status ?? 'draft') as PublishStatus,
        sold: row.commercial_status === 'sold' || row.is_sold === true,
        featured: false,
        coverUrl: undefined,
        media: [],
        createdAt: String(row.created_at ?? ''),
        updatedAt: String(row.updated_at ?? row.created_at ?? ''),
        artist: artistNameValue ? {
          id: String(row.artist_id ?? ''),
          firstName: nameParts[0] ?? '',
          lastName: nameParts.slice(1).join(' '),
          type: row.academic_status === 'graduate' ? 'graduate' : 'student',
          program: '',
        } : undefined,
      } as Artwork
    }),
  create: (input: ArtworkInput) =>
    request<Artwork>('/artworks', { method: 'POST', body: {
      title: input.title,
      description: input.description,
      artist_id: input.artistId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
      publication_status: input.status,
    } }),
  update: (id: string, input: ArtworkInput) =>
    request<Artwork>(`/artworks/${id}`, { method: 'PUT', body: {
      title: input.title,
      description: input.description,
      artist_id: input.artistId,
      category_id: input.categoryId,
      subcategory_id: input.subcategoryId,
    } }),
  remove: (id: string) => request<{ id: string }>(`/artworks/${id}`, { method: 'DELETE' }),
  changeStatus: (id: string, status: PublishStatus) =>
    request<Artwork>(`/artworks/${id}/status`, { method: 'PATCH', body: { status } }),
  uploadFiles: (id: string, files: File[], kind: MediaKind) => {
    const formData = new FormData()
    formData.set('kind', kind)
    files.forEach((file) => formData.append('files', file))
    return request<Artwork>(`/artworks/${id}/files`, { method: 'POST', formData })
  },
}

export const categoriesApi = {
  list: (filters: { search?: string; active?: boolean } = {}, signal?: AbortSignal) =>
    request<Array<Record<string, unknown>>>(`/categories${qs({ search: filters.search })}`, { signal }).then((rows) =>
      rows
        .filter((row) => filters.active === undefined || Boolean(row.is_active) === filters.active)
        .map((row) => ({
          id: String(row.id),
          name: String(row.name ?? ''),
          slug: String(row.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
          description: String(row.description ?? ''),
          color: '#6d4b8f',
          active: Boolean(row.is_active),
          createdAt: String(row.created_at ?? ''),
          subcategoryCount: Number(row.subcategory_count ?? 0),
          artworkCount: 0,
        })),
    ),
  create: (input: CategoryInput) => request<Record<string, unknown>>('/categories', { method: 'POST', body: { name: input.name, description: input.description } }).then((row) => ({
    id: String(row.id), name: String(row.name ?? ''), slug: input.slug, description: String(row.description ?? ''),
    color: input.color, active: true, createdAt: String(row.created_at ?? ''),
  })),
  update: (id: string, input: CategoryInput) => request<Record<string, unknown>>(`/categories/${id}`, { method: 'PUT', body: { name: input.name, description: input.description } }).then((row) => ({
    id: String(row.id), name: String(row.name ?? ''), slug: input.slug, description: String(row.description ?? ''),
    color: input.color, active: Boolean(row.is_active), createdAt: String(row.created_at ?? ''),
  })),
  remove: (id: string) => request<{ id: string }>(`/categories/${id}`, { method: 'DELETE' }),
  setActive: (id: string, active: boolean) =>
    request<Record<string, unknown>>(`/categories/${id}/status`, { method: 'PATCH', body: { is_active: active } }).then((row) => ({
      id: String(row.id), name: String(row.name ?? ''), slug: '', description: String(row.description ?? ''),
      color: '#6d4b8f', active: Boolean(row.is_active), createdAt: String(row.created_at ?? ''),
    })),
}

export const subcategoriesApi = {
  list: (filters: { search?: string; categoryId?: string; active?: boolean } = {}, signal?: AbortSignal) =>
    request<Array<Record<string, unknown>>>(
      `/subcategories${qs({ category_id: filters.categoryId })}`,
      { signal },
    ).then((rows) => rows
      .filter((row) => filters.active === undefined || Boolean(row.is_active) === filters.active)
      .filter((row) => !filters.search || String(row.name ?? '').toLowerCase().includes(filters.search.toLowerCase()))
      .map((row) => ({
        id: String(row.id),
        categoryId: String(row.category_id),
        name: String(row.name ?? ''),
        slug: String(row.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
        description: String(row.description ?? ''),
        active: Boolean(row.is_active),
        createdAt: String(row.created_at ?? ''),
        category: row.category_name ? { id: String(row.category_id), name: String(row.category_name), color: '#6d4b8f' } : undefined,
      })),
    ),
  create: (input: SubcategoryInput) => request<Record<string, unknown>>('/subcategories', { method: 'POST', body: {
    category_id: input.categoryId, name: input.name, description: input.description,
  } }).then((row) => ({
    id: String(row.id), categoryId: String(row.category_id), name: String(row.name ?? ''),
    slug: input.slug, description: String(row.description ?? ''), active: true, createdAt: String(row.created_at ?? ''),
  })),
  update: (id: string, input: SubcategoryInput) =>
    request<Record<string, unknown>>(`/subcategories/${id}`, { method: 'PUT', body: {
      category_id: input.categoryId, name: input.name, description: input.description,
    } }).then((row) => ({
      id: String(row.id), categoryId: String(row.category_id), name: String(row.name ?? ''),
      slug: input.slug, description: String(row.description ?? ''), active: Boolean(row.is_active),
      createdAt: String(row.created_at ?? ''),
    })),
  remove: (id: string) => request<{ id: string }>(`/subcategories/${id}`, { method: 'DELETE' }),
  setActive: (id: string, active: boolean) =>
    request<Record<string, unknown>>(`/subcategories/${id}/status`, { method: 'PATCH', body: { is_active: active } }).then((row) => ({
      id: String(row.id), categoryId: String(row.category_id), name: String(row.name ?? ''),
      slug: '', description: String(row.description ?? ''), active: Boolean(row.is_active),
      createdAt: String(row.created_at ?? ''),
    })),
}

export const artistsApi = {
  list: (filters: ArtistFilters = {}, signal?: AbortSignal) =>
    request<Array<Record<string, unknown>>>(
      `/artists${qs({
        search: filters.search,
        academic_status: filters.type,
      })}`,
      { signal },
    ).then((rows) => ({
      data: rows
        .filter((row) => !filters.status || (filters.status === 'active' ? Boolean(row.is_active) : Boolean(row.is_active) === false))
        .map((row) => ({
          id: String(row.id),
          firstName: String(row.first_name ?? ''),
          lastName: String(row.last_name ?? ''),
          email: String(row.email ?? ''),
          phone: '',
          document: '',
          program: '',
          type: (row.academic_status ?? 'student') as ArtistType,
          status: 'active' as ActiveStatus,
          startYear: Number(row.start_year ?? new Date().getFullYear()),
          endYear: row.end_year ? Number(row.end_year) : undefined,
          bio: String(row.bio ?? ''),
          createdAt: String(row.created_at ?? ''),
        })),
      meta: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
        total: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / (filters.limit ?? 10))),
      },
    })),
  get: (id: string, signal?: AbortSignal) => request<Record<string, unknown>>(`/artists/${id}`, { signal }).then((row) => ({
    id: String(row.id), firstName: String(row.first_name ?? ''), lastName: String(row.last_name ?? ''),
    email: String(row.email ?? ''), phone: '', document: '', program: '',
    type: (row.academic_status ?? 'student') as ArtistType, status: 'active' as ActiveStatus,
    startYear: Number(row.start_year ?? new Date().getFullYear()), endYear: row.end_year ? Number(row.end_year) : undefined,
    bio: '', createdAt: String(row.created_at ?? ''),
  })),
  create: (input: ArtistInput) => request<Record<string, unknown>>('/artists', { method: 'POST', body: {
    first_name: input.firstName, last_name: input.lastName, email: input.email,
    academic_status: input.type,
  } }).then((row) => ({
    id: String(row.id), firstName: String(row.first_name ?? input.firstName), lastName: String(row.last_name ?? input.lastName),
    email: String(row.email ?? input.email), phone: input.phone, document: input.document, program: input.program,
    type: input.type, status: input.status, startYear: input.startYear, endYear: input.endYear,
    bio: input.bio, createdAt: String(row.created_at ?? ''),
  })),
  update: (id: string, input: ArtistInput) => request<Record<string, unknown>>(`/artists/${id}`, { method: 'PUT', body: {
    first_name: input.firstName, last_name: input.lastName, email: input.email,
    academic_status: input.type,
  } }).then((row) => ({
    id: String(row.id), firstName: String(row.first_name ?? input.firstName), lastName: String(row.last_name ?? input.lastName),
    email: String(row.email ?? input.email), phone: input.phone, document: input.document, program: input.program,
    type: input.type, status: input.status, startYear: input.startYear, endYear: input.endYear,
    bio: input.bio, createdAt: String(row.created_at ?? ''),
  })),
  remove: (id: string) => request<{ id: string }>(`/artists/${id}`, { method: 'DELETE' }),
  graduate: (id: string, endYear?: number) =>
    request<Artist>(`/artists/${id}/academic-status`, { method: 'PATCH', body: { academic_status: 'graduate' } }),
  setStatus: (id: string, status: 'active' | 'inactive') =>
    request<Artist>(`/artists/${id}/status`, { method: 'PATCH', body: { status } }),
}
