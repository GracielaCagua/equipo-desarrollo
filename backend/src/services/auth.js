import { query } from '../db/pool.js';
import { hashPassword, validatePasswordStrength, verifyPassword } from '../auth/password.js';
import { permissionsFor } from '../auth/permissions.js';
import { signAccessToken } from '../auth/tokens.js';
import { HttpError } from '../utils/httpError.js';
import { requiredText, validateEmail } from '../validators/index.js';
import { logAction } from './audit.js';

const PUBLIC_FIELDS = 'id, full_name, email, role, is_active, last_login_at, created_at, updated_at';

export function toProfile(user) {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    role: user.role,
    permissions: permissionsFor(user.role),
    last_login_at: user.last_login_at
  };
}

export async function login(body, ip) {
  const email = validateEmail(body.email);
  const password = requiredText(body.password, 'password');
  const { rows } = await query('SELECT * FROM admin_users WHERE LOWER(email) = $1', [email]);
  const user = rows[0];
  // Mismo mensaje para usuario inexistente o contraseña errónea: evita enumerar cuentas.
  const valid = user ? await verifyPassword(password, user.password_hash) : false;
  if (!valid) throw new HttpError(401, 'Correo o contraseña incorrectos');
  if (!user.is_active) throw new HttpError(403, 'La cuenta está desactivada');

  const { rows: updated } = await query(
    `UPDATE admin_users SET last_login_at = NOW() WHERE id = $1 RETURNING ${PUBLIC_FIELDS}`,
    [user.id]
  );
  await logAction({ userId: user.id, action: 'auth.login', ip });
  return { token: signAccessToken(user), user: toProfile(updated[0]) };
}

export async function getProfile(userId) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM admin_users WHERE id = $1`, [userId]);
  const user = rows[0];
  if (!user || !user.is_active) throw new HttpError(401, 'Sesión inválida o expirada');
  return toProfile(user);
}

export async function changePassword(userId, body, ip) {
  const current = requiredText(body.current_password, 'current_password');
  const next = validatePasswordStrength(body.new_password);
  const { rows } = await query('SELECT password_hash FROM admin_users WHERE id = $1 AND is_active', [userId]);
  if (!rows[0] || !(await verifyPassword(current, rows[0].password_hash))) {
    throw new HttpError(400, 'La contraseña actual no es correcta');
  }
  await query(
    'UPDATE admin_users SET password_hash = $1, password_changed_at = NOW(), updated_at = NOW() WHERE id = $2',
    [await hashPassword(next), userId]
  );
  await logAction({ userId, action: 'auth.change_password', ip });
  return { message: 'Contraseña actualizada' };
}
