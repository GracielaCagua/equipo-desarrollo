import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { parseId, validateCommercialStatus } from '../validators/index.js';

export async function listWorks(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.category_id) {
    params.push(parseId(filters.category_id, 'category_id'));
    conditions.push(`w.category_id = $${params.length}`);
  }

  if (filters.subcategory_id) {
    params.push(parseId(filters.subcategory_id, 'subcategory_id'));
    conditions.push(`w.subcategory_id = $${params.length}`);
  }

  if (filters.artist_id) {
    params.push(parseId(filters.artist_id, 'artist_id'));
    conditions.push(`w.artist_id = $${params.length}`);
  }

  if (filters.commercial_status) {
    params.push(validateCommercialStatus(filters.commercial_status));
    conditions.push(`w.commercial_status = $${params.length}`);
  } else if (filters.is_sold !== undefined && filters.is_sold !== '') {
    const isSold = String(filters.is_sold) === 'true';
    params.push(isSold ? 'sold' : 'not_sold');
    conditions.push(`w.commercial_status = $${params.length}`);
  }

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(w.title ILIKE $${params.length} OR a.first_name ILIKE $${params.length} OR a.last_name ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      w.id,
      w.title,
      w.commercial_status,
      w.is_sold,
      w.category_id,
      c.name AS category_name,
      w.subcategory_id,
      s.name AS subcategory_name,
      w.artist_id,
      CONCAT(a.first_name, ' ', a.last_name) AS artist_name,
      a.email AS artist_email,
      a.academic_status,
      w.created_at,
      COUNT(DISTINCT ew.exhibition_id)::int AS exhibitions_count
    FROM works w
    JOIN artists a ON a.id = w.artist_id
    LEFT JOIN categories c ON c.id = w.category_id
    LEFT JOIN subcategories s ON s.id = w.subcategory_id
    LEFT JOIN exhibition_works ew ON ew.work_id = w.id
    ${where}
    GROUP BY w.id, a.id, c.id, s.id
    ORDER BY w.title ASC
  `;

  const { rows } = await query(sql, params);
  return rows;
}

export async function getWork(id) {
  const workId = parseId(id);
  const sql = `
    SELECT
      w.id,
      w.title,
      w.commercial_status,
      w.is_sold,
      w.category_id,
      c.name AS category_name,
      w.subcategory_id,
      s.name AS subcategory_name,
      w.artist_id,
      CONCAT(a.first_name, ' ', a.last_name) AS artist_name,
      a.email AS artist_email,
      a.academic_status,
      w.created_at
    FROM works w
    JOIN artists a ON a.id = w.artist_id
    LEFT JOIN categories c ON c.id = w.category_id
    LEFT JOIN subcategories s ON s.id = w.subcategory_id
    WHERE w.id = $1
  `;
  const { rows } = await query(sql, [workId]);
  if (!rows[0]) throw new HttpError(404, 'Obra no encontrada');
  return rows[0];
}

export async function updateCommercialStatus(id, body) {
  const workId = parseId(id);

  let statusValue;
  if (body?.commercial_status !== undefined) {
    statusValue = validateCommercialStatus(body.commercial_status);
  } else if (body?.is_sold !== undefined) {
    statusValue = validateCommercialStatus(body.is_sold);
  } else {
    throw new HttpError(400, 'Debe especificar commercial_status o is_sold');
  }

  const isSold = statusValue === 'sold';

  const { rows } = await query(
    'UPDATE works SET commercial_status = $1, is_sold = $2 WHERE id = $3 RETURNING *',
    [statusValue, isSold, workId]
  );

  if (!rows[0]) throw new HttpError(404, 'Obra no encontrada');
  return getWork(rows[0].id);
}

