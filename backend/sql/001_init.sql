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
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT works_subcategory_requires_category
    CHECK (subcategory_id IS NULL OR category_id IS NOT NULL),
  CONSTRAINT works_subcategory_category_fk
    FOREIGN KEY (subcategory_id, category_id)
    REFERENCES subcategories (id, category_id)
);

CREATE INDEX IF NOT EXISTS artists_status_idx ON artists (academic_status);
CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique_idx ON categories (LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS subcategories_category_name_unique_idx ON subcategories (category_id, LOWER(name));
CREATE UNIQUE INDEX IF NOT EXISTS artists_email_unique_idx ON artists (LOWER(email));
CREATE INDEX IF NOT EXISTS works_artist_idx ON works (artist_id);
CREATE INDEX IF NOT EXISTS works_category_idx ON works (category_id);
CREATE INDEX IF NOT EXISTS works_subcategory_idx ON works (subcategory_id);
