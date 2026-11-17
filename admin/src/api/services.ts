import type {
  Artist,
  ArtistFilters,
  ArtistInput,
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
    request<Category[]>(`/categories${qs({ search: filters.search, active: filters.active })}`, { signal }),
  create: (input: CategoryInput) => request<Category>('/categories', { method: 'POST', body: input }),
  update: (id: string, input: CategoryInput) => request<Category>(`/categories/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => request<{ id: string }>(`/categories/${id}`, { method: 'DELETE' }),
  setActive: (id: string, active: boolean) =>
    request<Category>(`/categories/${id}/status`, { method: 'PATCH', body: { active } }),
}

export const subcategoriesApi = {
  list: (filters: { search?: string; categoryId?: string; active?: boolean } = {}, signal?: AbortSignal) =>
    request<Subcategory[]>(
      `/subcategories${qs({ search: filters.search, categoryId: filters.categoryId, active: filters.active })}`,
      { signal },
    ),
  create: (input: SubcategoryInput) => request<Subcategory>('/subcategories', { method: 'POST', body: input }),
  update: (id: string, input: SubcategoryInput) =>
    request<Subcategory>(`/subcategories/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => request<{ id: string }>(`/subcategories/${id}`, { method: 'DELETE' }),
  setActive: (id: string, active: boolean) =>
    request<Subcategory>(`/subcategories/${id}/status`, { method: 'PATCH', body: { active } }),
}

export const artistsApi = {
  list: (filters: ArtistFilters = {}, signal?: AbortSignal) =>
    request<Paginated<Artist>>(
      `/artists${qs({
        search: filters.search,
        type: filters.type,
        status: filters.status,
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
      })}`,
      { signal },
    ),
  get: (id: string, signal?: AbortSignal) => request<Artist>(`/artists/${id}`, { signal }),
  create: (input: ArtistInput) => request<Artist>('/artists', { method: 'POST', body: input }),
  update: (id: string, input: ArtistInput) => request<Artist>(`/artists/${id}`, { method: 'PUT', body: input }),
  remove: (id: string) => request<{ id: string }>(`/artists/${id}`, { method: 'DELETE' }),
  graduate: (id: string, endYear?: number) =>
    request<Artist>(`/artists/${id}/graduate`, { method: 'PATCH', body: { endYear } }),
  setStatus: (id: string, status: 'active' | 'inactive') =>
    request<Artist>(`/artists/${id}/status`, { method: 'PATCH', body: { status } }),
}
