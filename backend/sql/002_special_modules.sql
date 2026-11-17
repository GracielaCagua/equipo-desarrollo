-- ========================================================
-- MÓDULOS ESPECIALES: PREMIOS, EXPOSICIONES, VENTAS Y CONTACTO
-- ========================================================

-- 1. Actualización de Obras para Estado Comercial (Ventas)
ALTER TABLE works ADD COLUMN IF NOT EXISTS commercial_status VARCHAR(20) NOT NULL DEFAULT 'not_sold';
ALTER TABLE works ADD COLUMN IF NOT EXISTS is_sold BOOLEAN NOT NULL DEFAULT FALSE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'works_commercial_status_check'
  ) THEN
    ALTER TABLE works ADD CONSTRAINT works_commercial_status_check CHECK (commercial_status IN ('sold', 'not_sold'));
  END IF;
END $$;

-- 2. Módulo de Premios
CREATE TABLE IF NOT EXISTS awards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  award_date DATE NOT NULL,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relación de obras asociadas al premio
CREATE TABLE IF NOT EXISTS award_works (
  award_id INTEGER NOT NULL REFERENCES awards(id) ON UPDATE CASCADE ON DELETE CASCADE,
  work_id INTEGER NOT NULL REFERENCES works(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (award_id, work_id)
);

-- 3. Módulo de Exposiciones y Galería
CREATE TABLE IF NOT EXISTS exhibitions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Obras que componen la galería de la exposición
CREATE TABLE IF NOT EXISTS exhibition_works (
  exhibition_id INTEGER NOT NULL REFERENCES exhibitions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  work_id INTEGER NOT NULL REFERENCES works(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  curator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exhibition_id, work_id)
);

-- 4. Bandeja y Formulario de Contacto
CREATE TABLE IF NOT EXISTS contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded', 'archived')),
  recipient_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de optimización
CREATE INDEX IF NOT EXISTS awards_artist_idx ON awards (artist_id);
CREATE INDEX IF NOT EXISTS awards_date_idx ON awards (award_date);
CREATE INDEX IF NOT EXISTS award_works_work_idx ON award_works (work_id);
CREATE INDEX IF NOT EXISTS exhibitions_dates_idx ON exhibitions (start_date, end_date);
CREATE INDEX IF NOT EXISTS exhibition_works_work_idx ON exhibition_works (work_id);
CREATE INDEX IF NOT EXISTS works_commercial_status_idx ON works (commercial_status);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages (status);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);

