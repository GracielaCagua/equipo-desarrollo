import { query } from '../db/pool.js';
import { fail } from '../utils/fail.js';
import { fileUrl, removeStoredFile } from './storage.js';

// w.* incluye también las columnas que agreguen otros módulos (p. ej. estado comercial)
const SELECT_ARTWORK = `
  SELECT w.*,
         COALESCE((
           SELECT json_agg(json_build_object(
                    'id', f.id, 'file_type', f.file_type, 'original_name', f.original_name,
                    'extension', f.extension, 'size_bytes', f.size_bytes, 'url', f.url
                  ) ORDER BY f.id)
           FROM work_files f WHERE f.work_id = w.id
         ), '[]'::json) AS files
  FROM works w`;

function mapDbError(err) {
  if (err.code === '23503') {
    throw fail(400, 'El artista, la categoría o la subcategoría no existe, o la subcategoría no pertenece a la categoría');
  }
  if (['22P02', '23502', '23514'].includes(err.code)) throw fail(400, 'Datos inválidos');
  throw err;
}

export async function getArtwork(id) {
  const { rows } = await query(`${SELECT_ARTWORK} WHERE w.id = $1`, [id]);
  if (!rows[0]) throw fail(404, 'Obra no encontrada');
  return rows[0];
}

export async function listArtworks(f) {
  const where = [];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };

  if (f.search) add('w.title ILIKE ?', `%${f.search}%`);
  if (f.artist_id) add('w.artist_id = ?', f.artist_id);
  if (f.category_id) add('w.category_id = ?', f.category_id);
  if (f.subcategory_id) add('w.subcategory_id = ?', f.subcategory_id);
  if (f.publication_status) add('w.publication_status = ?', f.publication_status);
  if (f.file_type) {
    add('EXISTS (SELECT 1 FROM work_files x WHERE x.work_id = w.id AND x.file_type = ?)', f.file_type);
  }
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const count = await query(`SELECT COUNT(*)::int AS total FROM works w ${whereSql}`, params);
  const total = count.rows[0].total;

  const { rows } = await query(
    `${SELECT_ARTWORK} ${whereSql}
     ORDER BY w.created_at DESC, w.id DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, f.limit, (f.page - 1) * f.limit],
  );
  return { data: rows, page: f.page, limit: f.limit, total, pages: Math.ceil(total / f.limit) };
}

export async function createArtwork(d) {
  try {
    const { rows } = await query(
      `INSERT INTO works (title, description, artist_id, category_id, subcategory_id, publication_status)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [d.title, d.description, d.artist_id, d.category_id, d.subcategory_id, d.publication_status],
    );
    return await getArtwork(rows[0].id);
  } catch (err) {
    return mapDbError(err);
  }
}

export async function updateArtwork(id, data) {
  const keys = Object.keys(data);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`);
  try {
    const { rowCount } = await query(
      `UPDATE works SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${keys.length + 1}`,
      [...keys.map((k) => data[k]), id],
    );
    if (!rowCount) throw fail(404, 'Obra no encontrada');
  } catch (err) {
    return mapDbError(err);
  }
  return getArtwork(id);
}

export async function setPublicationStatus(id, status) {
  const { rowCount } = await query(
    'UPDATE works SET publication_status = $1, updated_at = NOW() WHERE id = $2',
    [status, id],
  );
  if (!rowCount) throw fail(404, 'Obra no encontrada');
  return getArtwork(id);
}

export async function deleteArtwork(id) {
  const files = await query('SELECT stored_name FROM work_files WHERE work_id = $1', [id]);
  let rowCount;
  try {
    ({ rowCount } = await query('DELETE FROM works WHERE id = $1', [id])); // work_files cae por CASCADE
  } catch (err) {
    if (err.code === '23503') throw fail(409, 'La obra está asociada a otros registros (premios o exposiciones)');
    throw err;
  }
  if (!rowCount) throw fail(404, 'Obra no encontrada');
  await Promise.all(files.rows.map((r) => removeStoredFile(r.stored_name)));
}

// Un solo INSERT con varias filas: es atómico, entra todo o no entra nada
export async function addFiles(workId, files) {
  const values = [];
  const params = [];
  files.forEach((f, i) => {
    const b = i * 7;
    values.push(`($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${b + 6}, $${b + 7})`);
    params.push(workId, f.originalName.slice(0, 255), f.storedName, f.fileType, f.extension, f.size, fileUrl(f.storedName));
  });
  const { rows } = await query(
    `INSERT INTO work_files (work_id, original_name, stored_name, file_type, extension, size_bytes, url)
     VALUES ${values.join(', ')}
     RETURNING id, file_type, original_name, extension, size_bytes, url`,
    params,
  );
  return rows;
}

export async function deleteFile(workId, fileId) {
  const { rows } = await query(
    'DELETE FROM work_files WHERE id = $1 AND work_id = $2 RETURNING stored_name',
    [fileId, workId],
  );
  if (!rows[0]) throw fail(404, 'Archivo no encontrado');
  await removeStoredFile(rows[0].stored_name);
}