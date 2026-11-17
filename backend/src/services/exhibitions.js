import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import {
  optionalDate,
  optionalText,
  parseId,
  parseIdArray,
  requiredText,
  validateCommercialStatus,
  validateDate
} from '../validators/index.js';

export async function listExhibitions(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(e.title ILIKE $${params.length} OR e.location ILIKE $${params.length} OR COALESCE(e.description, '') ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      e.id,
      e.title,
      e.location,
      TO_CHAR(e.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(e.end_date, 'YYYY-MM-DD') AS end_date,
      e.description,
      e.created_at,
      e.updated_at,
      COUNT(DISTINCT ew.work_id)::int AS gallery_count
    FROM exhibitions e
    LEFT JOIN exhibition_works ew ON ew.exhibition_id = e.id
    ${where}
    GROUP BY e.id
    ORDER BY e.start_date DESC, e.title ASC
  `;

  const { rows } = await query(sql, params);
  return rows;
}

export async function getExhibition(id) {
  const exhibitionId = parseId(id);
  const sql = `
    SELECT
      e.id,
      e.title,
      e.location,
      TO_CHAR(e.start_date, 'YYYY-MM-DD') AS start_date,
      TO_CHAR(e.end_date, 'YYYY-MM-DD') AS end_date,
      e.description,
      e.created_at,
      e.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'work_id', w.id,
            'title', w.title,
            'category_id', w.category_id,
            'category_name', c.name,
            'subcategory_id', w.subcategory_id,
            'subcategory_name', s.name,
            'artist_id', a.id,
            'artist_name', CONCAT(a.first_name, ' ', a.last_name),
            'commercial_status', w.commercial_status,
            'is_sold', w.is_sold,
            'curator_notes', ew.curator_notes
          )
        ) FILTER (WHERE w.id IS NOT NULL),
        '[]'
      ) AS gallery
    FROM exhibitions e
    LEFT JOIN exhibition_works ew ON ew.exhibition_id = e.id
    LEFT JOIN works w ON w.id = ew.work_id
    LEFT JOIN artists a ON a.id = w.artist_id
    LEFT JOIN categories c ON c.id = w.category_id
    LEFT JOIN subcategories s ON s.id = w.subcategory_id
    WHERE e.id = $1
    GROUP BY e.id
  `;

  const { rows } = await query(sql, [exhibitionId]);
  if (!rows[0]) throw new HttpError(404, 'Exposición no encontrada');
  return rows[0];
}

export async function createExhibition(body) {
  const title = requiredText(body.title, 'title');
  const location = requiredText(body.location, 'location');
  const startDate = validateDate(body.start_date, 'start_date');
  const endDate = optionalDate(body.end_date, 'end_date');
  const description = optionalText(body.description);
  const workIds = parseIdArray(body.work_ids || body.works, 'work_ids');

  const { rows } = await query(
    'INSERT INTO exhibitions (title, location, start_date, end_date, description) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [title, location, startDate, endDate, description]
  );
  const exhibitionId = rows[0].id;

  if (workIds.length > 0) {
    for (const workId of workIds) {
      await query(
        'INSERT INTO exhibition_works (exhibition_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [exhibitionId, workId]
      );
    }
  }

  return getExhibition(exhibitionId);
}

export async function updateExhibition(id, body) {
  const exhibitionId = parseId(id);
  const title = requiredText(body.title, 'title');
  const location = requiredText(body.location, 'location');
  const startDate = validateDate(body.start_date, 'start_date');
  const endDate = optionalDate(body.end_date, 'end_date');
  const description = optionalText(body.description);

  const { rows } = await query(
    'UPDATE exhibitions SET title = $1, location = $2, start_date = $3, end_date = $4, description = $5, updated_at = NOW() WHERE id = $6 RETURNING id',
    [title, location, startDate, endDate, description, exhibitionId]
  );
  if (!rows[0]) throw new HttpError(404, 'Exposición no encontrada');

  if (body.work_ids !== undefined || body.works !== undefined) {
    const workIds = parseIdArray(body.work_ids || body.works, 'work_ids');
    await query('DELETE FROM exhibition_works WHERE exhibition_id = $1', [exhibitionId]);
    for (const workId of workIds) {
      await query(
        'INSERT INTO exhibition_works (exhibition_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [exhibitionId, workId]
      );
    }
  }

  return getExhibition(exhibitionId);
}

export async function deleteExhibition(id) {
  const exhibitionId = parseId(id);
  const { rowCount } = await query('DELETE FROM exhibitions WHERE id = $1', [exhibitionId]);
  if (rowCount === 0) throw new HttpError(404, 'Exposición no encontrada');
  return { success: true, message: 'Exposición eliminada correctamente' };
}

// ========================================================
// SECCIÓN ESPECIAL: OBRAS EXPUESTAS Y FILTROS POR CATEGORÍAS/SUBCATEGORÍAS
// ========================================================
export async function listExposedWorks(filters = {}) {
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

  if (filters.exhibition_id) {
    params.push(parseId(filters.exhibition_id, 'exhibition_id'));
    conditions.push(`e.id = $${params.length}`);
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
    conditions.push(`(w.title ILIKE $${params.length} OR a.first_name ILIKE $${params.length} OR a.last_name ILIKE $${params.length} OR e.title ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      w.id AS work_id,
      w.title AS work_title,
      w.commercial_status,
      w.is_sold,
      w.category_id,
      c.name AS category_name,
      w.subcategory_id,
      s.name AS subcategory_name,
      a.id AS artist_id,
      a.first_name AS artist_first_name,
      a.last_name AS artist_last_name,
      CONCAT(a.first_name, ' ', a.last_name) AS artist_name,
      a.academic_status,
      e.id AS exhibition_id,
      e.title AS exhibition_title,
      e.location AS exhibition_location,
      TO_CHAR(e.start_date, 'YYYY-MM-DD') AS exhibition_start_date,
      TO_CHAR(e.end_date, 'YYYY-MM-DD') AS exhibition_end_date,
      ew.curator_notes
    FROM exhibition_works ew
    JOIN exhibitions e ON e.id = ew.exhibition_id
    JOIN works w ON w.id = ew.work_id
    JOIN artists a ON a.id = w.artist_id
    LEFT JOIN categories c ON c.id = w.category_id
    LEFT JOIN subcategories s ON s.id = w.subcategory_id
    ${where}
    ORDER BY e.start_date DESC, w.title ASC
  `;

  const { rows } = await query(sql, params);
  return rows;
}

