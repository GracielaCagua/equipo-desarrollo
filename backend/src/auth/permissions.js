// Fuente única de verdad para roles y permisos. El frontend recibe la lista
// de permisos del usuario en /api/auth/me, así que no debe duplicar esta tabla.

export const PERMISSIONS = Object.freeze({
  CATALOG_WRITE: 'catalog:write', // categorías, subcategorías y artistas
  WORKS_WRITE: 'works:write', // obras, multimedia y estado comercial
  EVENTS_WRITE: 'events:write', // premios y exposiciones
  MESSAGES_MANAGE: 'messages:manage', // bandeja de contacto
  USERS_MANAGE: 'users:manage', // cuentas de administradores
  AUDIT_READ: 'audit:read'
});

const ALL = Object.values(PERMISSIONS);

export const ROLE_PERMISSIONS = Object.freeze({
  superadmin: ALL,
  admin: [
    PERMISSIONS.CATALOG_WRITE,
    PERMISSIONS.WORKS_WRITE,
    PERMISSIONS.EVENTS_WRITE,
    PERMISSIONS.MESSAGES_MANAGE,
    PERMISSIONS.AUDIT_READ
  ],
  editor: [PERMISSIONS.CATALOG_WRITE, PERMISSIONS.WORKS_WRITE, PERMISSIONS.EVENTS_WRITE]
});

export const ROLES = Object.freeze(Object.keys(ROLE_PERMISSIONS));

export function permissionsFor(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function hasPermission(role, permission) {
  return permissionsFor(role).includes(permission);
}
