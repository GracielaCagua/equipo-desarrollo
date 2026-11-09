-- ========================================================
-- AUTENTICACIÓN, ROLES Y AUDITORÍA (Desarrollador 1)
-- ========================================================
-- Depende únicamente de PostgreSQL; no modifica tablas de otros módulos.
-- Los permisos de cada rol se definen en backend/src/auth/permissions.js.

CREATE TABLE IF NOT EXISTS admin_users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'editor',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  password_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT admin_users_role_check CHECK (role IN ('superadmin', 'admin', 'editor'))
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique_idx ON admin_users (LOWER(email));
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON admin_users (role);

-- Registro de acciones administrativas relevantes (inicio de sesión, gestión de usuarios).
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  admin_user_id INTEGER REFERENCES admin_users(id) ON UPDATE CASCADE ON DELETE SET NULL,
  action VARCHAR(80) NOT NULL,
  entity VARCHAR(80),
  entity_id INTEGER,
  details JSONB,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_log_user_idx ON audit_log (admin_user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_idx ON audit_log (created_at DESC);
