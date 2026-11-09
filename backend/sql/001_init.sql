CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subcategories (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name VARCHAR(120) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT subcategories_id_category_unique UNIQUE (id, category_id)
);

CREATE TABLE IF NOT EXISTS artists (
  id SERIAL PRIMARY KEY,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  academic_status VARCHAR(20) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT artists_academic_status_check CHECK (academic_status IN ('student', 'graduate'))
);

-- Integration contract for Developer 2. Multimedia metadata belongs to that module.
CREATE TABLE IF NOT EXISTS works (
  id SERIAL PRIMARY KEY,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  category_id INTEGER REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  subcategory_id INTEGER REFERENCES subcategories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  title VARCHAR(200) NOT NULL,
  commercial_status VARCHAR(20) NOT NULL DEFAULT 'not_sold' CHECK (commercial_status IN ('sold', 'not_sold')),
  is_sold BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT works_subcategory_requires_category
    CHECK (subcategory_id IS NULL OR category_id IS NOT NULL),
  CONSTRAINT works_subcategory_category_fk
    FOREIGN KEY (subcategory_id, category_id)
    REFERENCES subcategories (id, category_id)
);

-- Módulos Especiales
CREATE TABLE IF NOT EXISTS awards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  award_date DATE NOT NULL,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS award_works (
  award_id INTEGER NOT NULL REFERENCES awards(id) ON UPDATE CASCADE ON DELETE CASCADE,
  work_id INTEGER NOT NULL REFERENCES works(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (award_id, work_id)
);

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

CREATE TABLE IF NOT EXISTS exhibition_works (
  exhibition_id INTEGER NOT NULL REFERENCES exhibitions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  work_id INTEGER NOT NULL REFERENCES works(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  curator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exhibition_id, work_id)
);

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

CREATE INDEX IF NOT EXISTS artists_status_idx ON artists (academic_status);
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique_idx ON categories (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_category_name_unique_idx ON subcategories (category_id, LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS artists_email_unique_idx ON artists (LOWER(email));
CREATE INDEX IF NOT EXISTS works_artist_idx ON works (artist_id);
CREATE INDEX IF NOT EXISTS works_category_idx ON works (category_id);
CREATE INDEX IF NOT EXISTS works_subcategory_idx ON works (subcategory_id);
CREATE INDEX IF NOT EXISTS works_commercial_status_idx ON works (commercial_status);
CREATE INDEX IF NOT EXISTS awards_artist_idx ON awards (artist_id);
CREATE INDEX IF NOT EXISTS awards_date_idx ON awards (award_date);
CREATE INDEX IF NOT EXISTS award_works_work_idx ON award_works (work_id);
CREATE INDEX IF NOT EXISTS exhibitions_dates_idx ON exhibitions (start_date, end_date);
CREATE INDEX IF NOT EXISTS exhibition_works_work_idx ON exhibition_works (work_id);
CREATE INDEX IF NOT EXISTS contact_messages_status_idx ON contact_messages (status);
CREATE INDEX IF NOT EXISTS contact_messages_created_idx ON contact_messages (created_at DESC);
