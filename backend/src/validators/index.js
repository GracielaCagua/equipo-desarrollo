import { HttpError } from '../utils/httpError.js';

const academicStatuses = new Set(['student', 'graduate']);
const commercialStatuses = new Set(['sold', 'not_sold']);
const messageStatuses = new Set(['unread', 'read', 'responded', 'archived']);

export function requiredText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${field} es obligatorio`);
  }
  return value.trim();
}

export function optionalText(value) {
  return value == null ? null : String(value).trim() || null;
}

export function validateAcademicStatus(value) {
  if (!academicStatuses.has(value)) {
    throw new HttpError(400, 'academic_status debe ser student o graduate');
  }
  return value;
}

export function validateCommercialStatus(value) {
  if (typeof value === 'boolean') {
    return value ? 'sold' : 'not_sold';
  }
  if (!commercialStatuses.has(value)) {
    throw new HttpError(400, 'commercial_status debe ser sold o not_sold');
  }
  return value;
}

export function validateMessageStatus(value) {
  if (!messageStatuses.has(value)) {
    throw new HttpError(400, 'status debe ser unread, read, responded o archived');
  }
  return value;
}

export function validateEmail(value) {
  const email = requiredText(value, 'email').toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpError(400, 'email no tiene un formato válido');
  }
  return email;
}

export function parseId(value, field = 'id') {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, `${field} debe ser un entero positivo`);
  return id;
}

export function validateDate(value, field = 'fecha') {
  const str = requiredText(value, field);
  // Match YYYY-MM-DD or standard ISO date prefix
  if (!/^\d{4}-\d{2}-\d{2}/.test(str)) {
    throw new HttpError(400, `${field} debe tener un formato de fecha válido (YYYY-MM-DD)`);
  }
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) {
    throw new HttpError(400, `${field} no corresponde a una fecha válida`);
  }
  return str.slice(0, 10);
}

export function optionalDate(value, field = 'fecha') {
  if (value == null || String(value).trim() === '') return null;
  return validateDate(value, field);
}

export function parseIdArray(values, field = 'ids') {
  if (values == null) return [];
  if (!Array.isArray(values)) {
    throw new HttpError(400, `${field} debe ser una lista de identificadores`);
  }
  return [...new Set(values.map((v) => parseId(v, `${field} elemento`)))];
}
