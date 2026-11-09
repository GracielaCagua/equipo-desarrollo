import { query } from '../db/pool.js';
import { hashPassword, validatePasswordStrength } from '../auth/password.js';
import { ROLES } from '../auth/permissions.js';
import { HttpError } from '../utils/httpError.js';
import { parseId, requiredText, validateEmail } from '../validators/index.js';
import { logAction } from './audit.js';

const FIELDS = 'id, full_name, email, role, is_active, last_login_at, created_at, updated_at';

export function validateRole(value) {
  if (!ROLES.includes(value)) throw new HttpError(400, `role debe ser uno de: ${ROLES.join(', ')}`);
  return value;
}

function uniqueEmail(error) {
  if (error.code === '23505') throw new HttpError(409, 'Ya existe un administrador con ese correo');
  throw error;
}

async function countActiveSuperadmins(excludeId) {
  const { rows } = await query(
    "SELECT COUNT(*)::int AS total FROM admin_users WHERE role = 'superadmin' AND is_active AND id <> $1",
    [excludeId]
  );
  return rows[0].total;
}

export async function listAdminUsers() {
  const { rows } = await query(`SELECT ${FIELDS} FROM admin_users ORDER BY full_name`);
  return rows;
}

export async function createAdminUser(body, actor) {
  const fullName = requiredText(body.full_name, 'full_name');
  const email = validateEmail(body.email);
  const role = validateRole(body.role ?? 'editor');
  const password = validatePasswordStrength(body.password);
  try {
    const { rows } = await query(
      `INSERT INTO admin_users (full_name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING ${FIELDS}`,
      [fullName, email, await hashPassword(password), role]
    );
    await logAction({ userId: actor.id, action: 'users.create', entity: 'admin_users', entityId: rows[0].id, details: { role } });
    return rows[0];
  } catch (error) {
    return uniqueEmail(error);
  }
}

export async function updateAdminUser(id, body, actor) {
  const userId = parseId(id);
  const fullName = requiredText(body.full_name, 'full_name');
  const email = validateEmail(body.email);
  const role = validateRole(body.role);
  if (userId === actor.id && role !== actor.role) throw new HttpError(400, 'No puede cambiar su propio rol');
  if (role !== 'superadmin' && (await countActiveSuperadmins(userId)) === 0) {
    const { rows } = await query('SELECT role FROM admin_users WHERE id = $1', [userId]);
    if (rows[0]?.role === 'superadmin') throw new HttpError(400, 'Debe existir al menos un superadministrador activo');
  }
  try {
    const { rows } = await query(
      `UPDATE admin_users SET full_name = $1, email = $2, role = $3, updated_at = NOW() WHERE id = $4 RETURNING ${FIELDS}`,
      [fullName, email, role, userId]
    );
    if (!rows[0]) throw new HttpError(404, 'Administrador no encontrado');
    await logAction({ userId: actor.id, action: 'users.update', entity: 'admin_users', entityId: userId, details: { role } });
    return rows[0];
  } catch (error) {
    return uniqueEmail(error);
  }
}

export async function setAdminUserStatus(id, isActive, actor) {
  const userId = parseId(id);
  if (typeof isActive !== 'boolean') throw new HttpError(400, 'is_active debe ser booleano');
  if (userId === actor.id && !isActive) throw new HttpError(400, 'No puede desactivar su propia cuenta');
  if (!isActive && (await countActiveSuperadmins(userId)) === 0) {
    const { rows } = await query('SELECT role FROM admin_users WHERE id = $1', [userId]);
    if (rows[0]?.role === 'superadmin') throw new HttpError(400, 'Debe existir al menos un superadministrador activo');
  }
  const { rows } = await query(
    `UPDATE admin_users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING ${FIELDS}`,
    [isActive, userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Administrador no encontrado');
  await logAction({ userId: actor.id, action: isActive ? 'users.activate' : 'users.deactivate', entity: 'admin_users', entityId: userId });
  return rows[0];
}

export async function resetAdminUserPassword(id, password, actor) {
  const userId = parseId(id);
  const valid = validatePasswordStrength(password);
  const { rows } = await query(
    `UPDATE admin_users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING ${FIELDS}`,
    [await hashPassword(valid), userId]
  );
  if (!rows[0]) throw new HttpError(404, 'Administrador no encontrado');
  await logAction({ userId: actor.id, action: 'users.reset_password', entity: 'admin_users', entityId: userId });
  return rows[0];
}
