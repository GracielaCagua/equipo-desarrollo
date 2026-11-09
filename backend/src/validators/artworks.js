import { fail } from '../utils/fail.js';
import { FILE_TYPES } from './files.js';

export const PUBLICATION_STATUSES = ['draft', 'published', 'archived'];

function positiveInt(value, field, { required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw fail(400, `${field} es obligatorio`);
    return undefined;
  }
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw fail(400, `${field} debe ser un entero positivo`);
  return n;
}

function text(value, field, { required = false, max }) {
  if (value === undefined || value === null) {
    if (required) throw fail(400, `${field} es obligatorio`);
    return undefined;
  }
  if (typeof value !== 'string') throw fail(400, `${field} debe ser texto`);
  const clean = value.trim();
  if (required && !clean) throw fail(400, `${field} es obligatorio`);
  if (clean.length > max) throw fail(400, `${field} no puede superar ${max} caracteres`);
  return clean;
}

export const idParam = (value, field = 'id') => positiveInt(value, field, { required: true });

export function validatePublicationStatus(value) {
  if (!PUBLICATION_STATUSES.includes(value)) {
    throw fail(400, `publication_status debe ser: ${PUBLICATION_STATUSES.join(', ')}`);
  }
  return value;
}

export function validateArtworkCreate(body = {}) {
  return {
    title: text(body.title, 'title', { required: true, max: 200 }),
    description: text(body.description, 'description', { max: 5000 }) ?? null,
    artist_id: positiveInt(body.artist_id, 'artist_id', { required: true }),
    category_id: positiveInt(body.category_id, 'category_id', { required: true }),
    subcategory_id: positiveInt(body.subcategory_id, 'subcategory_id', { required: true }),
    publication_status: validatePublicationStatus(body.publication_status ?? 'draft'),
  };
}

export function validateArtworkUpdate(body = {}) {
  const data = {
    title: text(body.title, 'title', { max: 200 }),
    description: text(body.description, 'description', { max: 5000 }),
    artist_id: positiveInt(body.artist_id, 'artist_id'),
    category_id: positiveInt(body.category_id, 'category_id'),
    subcategory_id: positiveInt(body.subcategory_id, 'subcategory_id'),
  };
  if (data.title === '') throw fail(400, 'title no puede estar vacío');
  const clean = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
  if (Object.keys(clean).length === 0) throw fail(400, 'No hay campos para actualizar');
  return clean;
}

export function parseArtworkQuery(query = {}) {
  const page = positiveInt(query.page, 'page') ?? 1;
  const limit = positiveInt(query.limit, 'limit') ?? 10;
  if (limit > 100) throw fail(400, 'limit no puede superar 100');

  const filters = {
    page,
    limit,
    search: typeof query.search === 'string' ? query.search.trim().slice(0, 100) : undefined,
    artist_id: positiveInt(query.artist_id, 'artist_id'),
    category_id: positiveInt(query.category_id, 'category_id'),
    subcategory_id: positiveInt(query.subcategory_id, 'subcategory_id'),
    publication_status: query.publication_status ? validatePublicationStatus(query.publication_status) : undefined,
    file_type: query.file_type,
  };
  if (filters.file_type && !FILE_TYPES[filters.file_type]) {
    throw fail(400, `file_type debe ser: ${Object.keys(FILE_TYPES).join(', ')}`);
  }
  return filters;
}