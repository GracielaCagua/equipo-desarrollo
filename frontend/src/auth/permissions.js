// Debe coincidir con backend/src/auth/permissions.js (el backend es quien decide;
// el frontend solo oculta lo que el usuario no puede usar).
export const PERMISSIONS = Object.freeze({
  CATALOG_WRITE: 'catalog:write',
  WORKS_WRITE: 'works:write',
  EVENTS_WRITE: 'events:write',
  MESSAGES_MANAGE: 'messages:manage',
  USERS_MANAGE: 'users:manage',
  AUDIT_READ: 'audit:read'
});

export const ROLE_LABELS = Object.freeze({
  superadmin: 'Superadministrador',
  admin: 'Administrador',
  editor: 'Editor'
});
