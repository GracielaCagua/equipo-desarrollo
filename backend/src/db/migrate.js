// Aplica en orden los scripts de backend/sql/*.sql que aún no se hayan ejecutado.
// Uso: npm run db:migrate   (lee DATABASE_URL de backend/.env)
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pool } from './pool.js';

const sqlDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../sql');

async function migrate() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
    filename VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`);
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  const applied = new Set(rows.map((row) => row.filename));
  const files = (await readdir(sqlDir)).filter((file) => /^\d+_.+\.sql$/.test(file)).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(sqlDir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✔ ${file}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Falló ${file}: ${error.message}`);
    } finally {
      client.release();
    }
  }
  console.log('Migraciones al día.');
}

migrate()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
