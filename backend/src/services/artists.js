import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { parseId, requiredText, validateAcademicStatus, validateEmail } from '../validators/index.js';

const artistSelect = `SELECT a.*, CONCAT(a.first_name, ' ', a.last_name) AS full_name
  FROM artists a`;

export async function listArtists(filters) {
  const conditions = [];
  const params = [];
  if (filters.academic_status) {
    params.push(validateAcademicStatus(filters.academic_status));
    conditions.push(`a.academic_status = $${params.length}`);
  }
  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(a.first_name ILIKE $${params.length} OR a.last_name ILIKE $${params.length} OR a.email ILIKE $${params.length})`);
  }
  if (filters.category_id) {
    params.push(parseId(filters.category_id, 'category_id'));
    conditions.push(`EXISTS (SELECT 1 FROM works w WHERE w.artist_id = a.id AND w.category_id = $${params.length})`);
  }
  if (filters.subcategory_id) {
    params.push(parseId(filters.subcategory_id, 'subcategory_id'));
    conditions.push(`EXISTS (SELECT 1 FROM works w WHERE w.artist_id = a.id AND w.subcategory_id = $${params.length})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(`${artistSelect} ${where} ORDER BY a.last_name, a.first_name`, params);
  return rows;
}

export async function getArtist(id) {
  const { rows } = await query(`${artistSelect} WHERE a.id = $1`, [parseId(id)]);
  if (!rows[0]) throw new HttpError(404, 'Artista no encontrado');
  return rows[0];
}

export async function createArtist(body) {
  const firstName = requiredText(body.first_name, 'first_name');
  const lastName = requiredText(body.last_name, 'last_name');
  const email = validateEmail(body.email);
  const academicStatus = validateAcademicStatus(body.academic_status);
  try {
    const { rows } = await query(
      'INSERT INTO artists (first_name, last_name, email, academic_status) VALUES ($1, $2, $3, $4) RETURNING id',
      [firstName, lastName, email, academicStatus]
    );
    return getArtist(rows[0].id);
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Ya existe un artista con ese correo');
    throw error;
  }
}

export async function updateArtist(id, body) {
  const artistId = parseId(id);
  const values = [
    requiredText(body.first_name, 'first_name'),
    requiredText(body.last_name, 'last_name'),
    validateEmail(body.email),
    validateAcademicStatus(body.academic_status)
  ];
  try {
    const { rows } = await query(
      'UPDATE artists SET first_name = $1, last_name = $2, email = $3, academic_status = $4, updated_at = NOW() WHERE id = $5 RETURNING id',
      [...values, artistId]
    );
    if (!rows[0]) throw new HttpError(404, 'Artista no encontrado');
    return getArtist(rows[0].id);
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Ya existe un artista con ese correo');
    throw error;
  }
}

export async function updateAcademicStatus(id, academicStatus) {
  const { rows } = await query(
    'UPDATE artists SET academic_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [validateAcademicStatus(academicStatus), parseId(id)]
  );
  if (!rows[0]) throw new HttpError(404, 'Artista no encontrado');
  return rows[0];
}

export async function listArtistWorks(id) {
  const artistId = parseId(id);
  await getArtist(artistId);
  const { rows } = await query(
    `SELECT w.*, c.name AS category_name, s.name AS subcategory_name
     FROM works w LEFT JOIN categories c ON c.id = w.category_id
     LEFT JOIN subcategories s ON s.id = w.subcategory_id
     WHERE w.artist_id = $1 ORDER BY w.created_at DESC`,
    [artistId]
  );
  return rows;
}

