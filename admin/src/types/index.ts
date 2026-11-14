export type PublishStatus = 'draft' | 'published' | 'archived'
export type ArtistType = 'student' | 'graduate'
export type ActiveStatus = 'active' | 'inactive'
export type UserRole = 'admin' | 'editor'
export type MediaKind = 'image' | 'video' | 'document'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface Session {
  token: string
  user: User
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string
  color: string
  active: boolean
  createdAt: string
  subcategoryCount?: number
  artworkCount?: number
}

export interface Subcategory {
  id: string
  categoryId: string
  name: string
  slug: string
  description: string
  active: boolean
  createdAt: string
  artworkCount?: number
  category?: Pick<Category, 'id' | 'name' | 'color'>
}

export interface Artist {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  document: string
  program: string
  type: ArtistType
  status: ActiveStatus
  startYear: number
  endYear?: number
  bio: string
  createdAt: string
  artworkCount?: number
}

export interface MediaFile {
  id: string
  name: string
  type: string
  size: number
  kind: MediaKind
  url?: string
  /** Solo se usa en el cliente, para subir el archivo al backend. */
  file?: File
}

export interface Artwork {
  id: string
  title: string
  slug: string
  description: string
  year: number
  technique: string
  dimensions: string
  categoryId: string
  subcategoryId: string
  artistId: string
  status: PublishStatus
  sold: boolean
  featured: boolean
  coverUrl?: string
  media: MediaFile[]
  createdAt: string
  updatedAt: string
  artist?: Pick<Artist, 'id' | 'firstName' | 'lastName' | 'type' | 'program'>
  category?: Pick<Category, 'id' | 'name' | 'color'>
  subcategory?: Pick<Subcategory, 'id' | 'name'>
}

export interface ArtworkInput {
  title: string
  description: string
  year: number
  technique: string
  dimensions: string
  categoryId: string
  subcategoryId: string
  artistId: string
  status: PublishStatus
  sold: boolean
  featured: boolean
  coverUrl?: string
  media: MediaFile[]
}

export interface CategoryInput {
  name: string
  slug: string
  description: string
  color: string
  active: boolean
}

export interface SubcategoryInput {
  categoryId: string
  name: string
  slug: string
  description: string
  active: boolean
}

export interface ArtistInput {
  firstName: string
  lastName: string
  email: string
  phone: string
  document: string
  program: string
  type: ArtistType
  status: ActiveStatus
  startYear: number
  endYear?: number
  bio: string
}

export interface PageMeta {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  meta: PageMeta
}

export interface ArtworkFilters {
  search?: string
  status?: PublishStatus | ''
  categoryId?: string
  subcategoryId?: string
  artistId?: string
  sold?: boolean
  page?: number
  limit?: number
}

export interface ArtistFilters {
  search?: string
  type?: ArtistType | ''
  status?: ActiveStatus | ''
  page?: number
  limit?: number
}

export interface CategoryStat {
  id: string
  name: string
  color: string
  count: number
}

export interface DashboardStats {
  artworks: {
    total: number
    published: number
    draft: number
    archived: number
    sold: number
  }
  artists: {
    total: number
    students: number
    graduates: number
    inactive: number
  }
  categories: {
    total: number
    active: number
    subcategories: number
  }
  byCategory: CategoryStat[]
  recent: Artwork[]
}
