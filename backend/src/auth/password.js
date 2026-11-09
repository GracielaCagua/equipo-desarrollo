import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { HttpError } from '../utils/httpError.js';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const COST = 16384;

// Formato almacenado: scrypt$<N>$<salt base64>$<hash base64>
export async function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, KEY_LENGTH, { N: COST });
  return `scrypt$${COST}$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const [algorithm, cost, salt, expected] = stored.split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const expectedBuffer = Buffer.from(expected, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expectedBuffer.length, { N: Number(cost) });
  return timingSafeEqual(actual, expectedBuffer);
}

export function validatePasswordStrength(password) {
  if (typeof password !== 'string' || password.length < 10) {
    throw new HttpError(400, 'La contraseña debe tener al menos 10 caracteres');
  }
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, 'La contraseña debe combinar letras y números');
  }
  return password;
}
