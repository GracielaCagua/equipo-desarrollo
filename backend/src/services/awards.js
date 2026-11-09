import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { optionalText, parseId, parseIdArray, requiredText, validateDate } from '../validators/index.js';

export async function listAwards(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.artist_id) {
    params.push(parseId(filters.artist_id, 'artist_id'));
    conditions.push(`a.artist_id = $${params.length}`);
  }

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(a.name ILIKE $${params.length} OR COALESCE(a.description, '') ILIKE $${params.length} OR art.first_name ILIKE $${params.length} OR art.last_name ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT
      a.id,
      a.name,
      a.description,
      TO_CHAR(a.award_date, 'YYYY-MM-DD') AS award_date,
      a.artist_id,
      a.created_at,
      a.updated_at,
      art.first_name AS artist_first_name,
      art.last_name AS artist_last_name,
      CONCAT(art.first_name, ' ', art.last_name) AS artist_name,
      art.email AS artist_email,
      COALESCE(
        json_agg(
          json_build_object(
            'id', w.id,
            'title', w.title,
            'category_id', w.category_id,
            'subcategory_id', w.subcategory_id
          )
        ) FILTER (WHERE w.id IS NOT NULL),
        '[]'
      ) AS related_works
    FROM awards a
    JOIN artists art ON art.id = a.artist_id
    LEFT JOIN award_works aw ON aw.award_id = a.id
    LEFT JOIN works w ON w.id = aw.work_id
    ${where}
    GROUP BY a.id, art.id
    ORDER BY a.award_date DESC, a.name ASC
  `;

  const { rows } = await query(sql, params);
  return rows;
}

export async function getAward(id) {
  const awardId = parseId(id);
  const sql = `
    SELECT
      a.id,
      a.name,
      a.description,
      TO_CHAR(a.award_date, 'YYYY-MM-DD') AS award_date,
      a.artist_id,
      a.created_at,
      a.updated_at,
      art.first_name AS artist_first_name,
      art.last_name AS artist_last_name,
      CONCAT(art.first_name, ' ', art.last_name) AS artist_name,
      art.email AS artist_email,
      COALESCE(
        json_agg(
          json_build_object(
            'id', w.id,
            'title', w.title,
            'category_id', w.category_id,
            'subcategory_id', w.subcategory_id
          )
        ) FILTER (WHERE w.id IS NOT NULL),
        '[]'
      ) AS related_works
    FROM awards a
    JOIN artists art ON art.id = a.artist_id
    LEFT JOIN award_works aw ON aw.award_id = a.id
    LEFT JOIN works w ON w.id = aw.work_id
    WHERE a.id = $1
    GROUP BY a.id, art.id
  `;
  const { rows } = await query(sql, [awardId]);
  if (!rows[0]) throw new HttpError(404, 'Premio no encontrado');
  return rows[0];
}

export async function createAward(body) {
  const name = requiredText(body.name, 'name');
  const description = optionalText(body.description);
  const awardDate = validateDate(body.award_date || body.date, 'award_date');
  const artistId = parseId(body.artist_id, 'artist_id');
  const workIds = parseIdArray(body.work_ids || body.works, 'work_ids');

  // Verificar existencia del artista
  const artistCheck = await query('SELECT id FROM artists WHERE id = $1', [artistId]);
  if (!artistCheck.rows[0]) {
    throw new HttpError(404, 'El artista asociado no existe');
  }

  const { rows } = await query(
    'INSERT INTO awards (name, description, award_date, artist_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [name, description, awardDate, artistId]
  );
  const awardId = rows[0].id;

  if (workIds.length > 0) {
    for (const workId of workIds) {
      await query(
        'INSERT INTO award_works (award_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [awardId, workId]
      );
    }
  }

  return getAward(awardId);
}

export async function updateAward(id, body) {
  const awardId = parseId(id);
  const name = requiredText(body.name, 'name');
  const description = optionalText(body.description);
  const awardDate = validateDate(body.award_date || body.date, 'award_date');
  const artistId = parseId(body.artist_id, 'artist_id');

  const artistCheck = await query('SELECT id FROM artists WHERE id = $1', [artistId]);
  if (!artistCheck.rows[0]) {
    throw new HttpError(404, 'El artista asociado no existe');
  }

  const { rows } = await query(
    'UPDATE awards SET name = $1, description = $2, award_date = $3, artist_id = $4, updated_at = NOW() WHERE id = $5 RETURNING id',
    [name, description, awardDate, artistId, awardId]
  );
  if (!rows[0]) throw new HttpError(404, 'Premio no encontrado');

  if (body.work_ids !== undefined || body.works !== undefined) {
    const workIds = parseIdArray(body.work_ids || body.works, 'work_ids');
    await query('DELETE FROM award_works WHERE award_id = $1', [awardId]);
    for (const workId of workIds) {
      await query(
        'INSERT INTO award_works (award_id, work_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [awardId, workId]
      );
    }
  }

  return getAward(awardId);
}

export async function deleteAward(id) {
  const awardId = parseId(id);
  const { rowCount } = await query('DELETE FROM awards WHERE id = $1', [awardId]);
  if (rowCount === 0) throw new HttpError(404, 'Premio no encontrado');
  return { success: true, message: 'Premio eliminado correctamente' };
}

