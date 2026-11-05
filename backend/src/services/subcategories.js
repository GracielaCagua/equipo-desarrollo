import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { optionalText, parseId, requiredText } from '../validators/index.js';

async function ensureCategory(categoryId) {
  const { rowCount } = await query('SELECT 1 FROM categories WHERE id = $1', [categoryId]);
  if (!rowCount) throw new HttpError(400, 'La categoría principal no existe');
}

export async function listSubcategories(categoryId) {
  const params = [];
  let where = '';
  if (categoryId != null && categoryId !== '') {
    params.push(parseId(categoryId, 'category_id'));
    where = 'WHERE s.category_id = $1';
  }
  const { rows } = await query(
    `SELECT s.*, c.name AS category_name FROM subcategories s
     JOIN categories c ON c.id = s.category_id ${where} ORDER BY c.name, s.name`,
    params
  );
  return rows;
}

export async function getSubcategory(id) {
  const { rows } = await query(
    'SELECT s.*, c.name AS category_name FROM subcategories s JOIN categories c ON c.id = s.category_id WHERE s.id = $1',
    [parseId(id)]
  );
  if (!rows[0]) throw new HttpError(404, 'Subcategoría no encontrada');
  return rows[0];
}

export async function createSubcategory(body) {
  const categoryId = parseId(body.category_id, 'category_id');
  await ensureCategory(categoryId);
  try {
    const { rows } = await query(
      'INSERT INTO subcategories (category_id, name, description) VALUES ($1, $2, $3) RETURNING *',
      [categoryId, requiredText(body.name, 'name'), optionalText(body.description)]
    );
    return getSubcategory(rows[0].id);
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Ya existe esa subcategoría dentro de la categoría');
    throw error;
  }
}

export async function updateSubcategory(id, body) {
  const subcategoryId = parseId(id);
  const categoryId = parseId(body.category_id, 'category_id');
  await ensureCategory(categoryId);
  try {
    const { rows } = await query(
      `UPDATE subcategories SET category_id = $1, name = $2, description = $3, updated_at = NOW()
       WHERE id = $4 RETURNING id`,
      [categoryId, requiredText(body.name, 'name'), optionalText(body.description), subcategoryId]
    );
    if (!rows[0]) throw new HttpError(404, 'Subcategoría no encontrada');
    return getSubcategory(rows[0].id);
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Ya existe esa subcategoría dentro de la categoría');
    throw error;
  }
}

export async function setSubcategoryStatus(id, isActive) {
  if (typeof isActive !== 'boolean') throw new HttpError(400, 'is_active debe ser booleano');
  const { rows } = await query(
    'UPDATE subcategories SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [isActive, parseId(id)]
  );
  if (!rows[0]) throw new HttpError(404, 'Subcategoría no encontrada');
  return rows[0];
}

