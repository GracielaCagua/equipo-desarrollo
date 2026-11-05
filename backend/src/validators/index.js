import { HttpError } from '../utils/httpError.js';

const academicStatuses = new Set(['student', 'graduate']);

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

