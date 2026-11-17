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
    request<Paginated<Artwork>>(
      `/artworks${qs({
        search: filters.search,
        status: filters.status,
        categoryId: filters.categoryId,
        subcategoryId: filters.subcategoryId,
        artistId: filters.artistId,
        sold: filters.sold,
        page: filters.page ?? 1,
        limit: filters.limit ?? 10,
      })}`,
      { signal },
    ),
  get: (id: string, signal?: AbortSignal) => request<Artwork>(`/artworks/${id}`, { signal }),
  create: (input: ArtworkInput) => request<Artwork>('/artworks', { method: 'POST', body: input }),
  update: (id: string, input: ArtworkInput) => request<Artwork>(`/artworks/${id}`, { method: 'PUT', body: input }),
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
