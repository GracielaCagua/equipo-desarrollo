import type { User, UserRole } from '../types'

export type Permission =
  | 'artworks:write'
  | 'artworks:delete'
  | 'categories:write'
  | 'subcategories:write'
  | 'artists:write'
  | 'artists:graduate'
  | 'artists:delete'

const PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'artworks:write',
    'artworks:delete',
    'categories:write',
    'subcategories:write',
    'artists:write',
    'artists:graduate',
    'artists:delete',
  ],
  editor: ['artworks:write', 'artworks:delete'],
}

export function can(user: User | null, permission: Permission): boolean {
  if (!user) return false
  return PERMISSIONS[user.role]?.includes(permission) ?? false
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  editor: 'Editor',
}
