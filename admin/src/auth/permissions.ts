import type { User, UserRole } from '../types'

export type Permission =
  | 'artworks:write'
  | 'artworks:delete'
  | 'categories:write'
  | 'subcategories:write'
  | 'artists:write'
  | 'artists:graduate'
  | 'artists:delete'
  | 'users:manage'

const PERMISSIONS: Record<UserRole, Permission[]> = {
  superadmin: [
    'artworks:write', 'artworks:delete', 'categories:write', 'subcategories:write',
    'artists:write', 'artists:graduate', 'artists:delete', 'users:manage',
  ],
  admin: [
    'artworks:write',
    'artworks:delete',
    'categories:write',
    'subcategories:write',
    'artists:write',
    'artists:graduate',
    'artists:delete',
    'users:manage',
  ],
  editor: [],
}

export function can(user: User | null, permission: Permission): boolean {
  if (!user) return false
  return PERMISSIONS[user.role]?.includes(permission) ?? false
}

export const ROLE_LABELS: Record<UserRole, string> = {
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  editor: 'Usuario',
}
