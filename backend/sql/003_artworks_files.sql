ALTER TABLE works
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS publication_status VARCHAR(20) NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'works_publication_status_check') THEN
    ALTER TABLE works
      ADD CONSTRAINT works_publication_status_check
      CHECK (publication_status IN ('draft', 'published', 'archived'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_works_publication_status ON works (publication_status);
CREATE INDEX IF NOT EXISTS idx_works_created_at ON works (created_at DESC);

-- work_id toma el mismo tipo que works.id (integer, bigint o uuid)
DO $$
DECLARE id_type TEXT;
BEGIN
  SELECT format_type(atttypid, atttypmod) INTO id_type
  FROM pg_attribute WHERE attrelid = 'works'::regclass AND attname = 'id';

  EXECUTE format($f$
    CREATE TABLE IF NOT EXISTS work_files (
      id            BIGSERIAL PRIMARY KEY,
      work_id       %s NOT NULL REFERENCES works(id) ON DELETE CASCADE,
      original_name VARCHAR(255) NOT NULL,
      stored_name   VARCHAR(100) NOT NULL UNIQUE,
      file_type     VARCHAR(20)  NOT NULL CHECK (file_type IN ('image','video','model3d','document')),
      extension     VARCHAR(10)  NOT NULL,
      size_bytes    BIGINT       NOT NULL CHECK (size_bytes > 0),
      url           VARCHAR(300) NOT NULL,
      created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )$f$, id_type);
END $$;

CREATE INDEX IF NOT EXISTS idx_work_files_work_id ON work_files (work_id);
CREATE INDEX IF NOT EXISTS idx_work_files_type ON work_files (file_type);