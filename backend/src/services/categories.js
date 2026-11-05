import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { optionalText, parseId, requiredText } from '../validators/index.js';

export async function listCategories(search) {
  const params = [];
  let where = '';
  if (search?.trim()) {
    params.push(`%${search.trim()}%`);
    where = 'WHERE c.name ILIKE $1 OR COALESCE(c.description, \'\') ILIKE $1';
  }
  const { rows } = await query(
    `SELECT c.*, COUNT(DISTINCT s.id)::int AS subcategory_count
     FROM categories c LEFT JOIN subcategories s ON s.category_id = c.id
     ${where} GROUP BY c.id ORDER BY c.name`,
    params
  );
  return rows;
}

export async function getCategory(id) {
  const { rows } = await query('SELECT * FROM categories WHERE id = $1', [parseId(id)]);
  if (!rows[0]) throw new HttpError(404, 'Categoría no encontrada');
  return rows[0];
}

export async function createCategory(body) {
  const name = requiredText(body.name, 'name');
  const description = optionalText(body.description);
  try {
    const { rows } = await query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description]
    );
    return rows[0];
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Ya existe una categoría con ese nombre');
    throw error;
  }
}

export async function updateCategory(id, body) {
  const categoryId = parseId(id);
  const name = requiredText(body.name, 'name');
  const description = optionalText(body.description);
  try {
    const { rows } = await query(
      'UPDATE categories SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
      [name, description, categoryId]
    );
    if (!rows[0]) throw new HttpError(404, 'Categoría no encontrada');
    return rows[0];
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Ya existe una categoría con ese nombre');
    throw error;
  }
}

export async function setCategoryStatus(id, isActive) {
  if (typeof isActive !== 'boolean') throw new HttpError(400, 'is_active debe ser booleano');
  const { rows } = await query(
    'UPDATE categories SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [isActive, parseId(id)]
  );
  if (!rows[0]) throw new HttpError(404, 'Categoría no encontrada');
  return rows[0];
}

