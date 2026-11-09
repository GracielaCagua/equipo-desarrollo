process.env.NODE_ENV = 'test';

import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

const { app } = await import('../src/app.js');
const { pool } = await import('../src/db/pool.js');
const { signAccessToken } = await import('../src/auth/tokens.js');
const { hashPassword, verifyPassword, validatePasswordStrength } = await import('../src/auth/password.js');
const { hasPermission, PERMISSIONS, ROLES } = await import('../src/auth/permissions.js');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  server.close();
  await pool.end();
});

const tokenFor = (role, id = 1) => signAccessToken({ id, role, full_name: `Usuario ${role}` });

function call(path, { method = 'GET', token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(`${baseUrl}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

test('hashea y verifica contraseñas sin guardarlas en claro', async () => {
  const hash = await hashPassword('ClaveSegura123');
  assert.match(hash, /^scrypt\$/);
  assert.ok(!hash.includes('ClaveSegura123'));
  assert.equal(await verifyPassword('ClaveSegura123', hash), true);
  assert.equal(await verifyPassword('otraClave999', hash), false);
  assert.equal(await verifyPassword('x', 'formato-invalido'), false);
});

test('exige contraseñas robustas', () => {
  assert.throws(() => validatePasswordStrength('corta1'), /10 caracteres/);
  assert.throws(() => validatePasswordStrength('solamenteletras'), /letras y números/);
  assert.equal(validatePasswordStrength('letras12345'), 'letras12345');
});

test('matriz de permisos por rol', () => {
  assert.deepEqual(ROLES, ['superadmin', 'admin', 'editor']);
  assert.ok(hasPermission('superadmin', PERMISSIONS.USERS_MANAGE));
  assert.ok(!hasPermission('admin', PERMISSIONS.USERS_MANAGE));
  assert.ok(hasPermission('admin', PERMISSIONS.MESSAGES_MANAGE));
  assert.ok(!hasPermission('editor', PERMISSIONS.MESSAGES_MANAGE));
  assert.ok(hasPermission('editor', PERMISSIONS.CATALOG_WRITE));
  assert.ok(!hasPermission('desconocido', PERMISSIONS.CATALOG_WRITE));
});

test('health es público', async () => {
  const res = await call('/health');
  assert.equal(res.status, 200);
});

test('escrituras del catálogo exigen sesión', async () => {
  for (const [method, path] of [['POST', '/categories'], ['PUT', '/categories/1'], ['PATCH', '/subcategories/1/status'], ['POST', '/artists']]) {
    const res = await call(path, { method, body: {} });
    assert.equal(res.status, 401, `${method} ${path}`);
  }
});

test('rechaza tokens manipulados o con otro formato', async () => {
  const forged = `${tokenFor('superadmin').slice(0, -3)}abc`;
  assert.equal((await call('/categories', { method: 'POST', token: forged, body: {} })).status, 401);
  const res = await fetch(`${baseUrl}/categories`, { method: 'POST', headers: { Authorization: 'Basic abc' } });
  assert.equal(res.status, 401);
});

test('con token válido la escritura llega a la validación del módulo', async () => {
  // Cuerpo vacío => 400 del validador, lo que prueba que pasó la autenticación sin tocar la BD.
  const res = await call('/categories', { method: 'POST', token: tokenFor('editor'), body: {} });
  assert.equal(res.status, 400);
});

test('administración de usuarios solo para superadmin', async () => {
  assert.equal((await call('/admin-users')).status, 401);
  assert.equal((await call('/admin-users', { token: tokenFor('admin') })).status, 403);
  assert.equal((await call('/admin-users', { token: tokenFor('editor') })).status, 403);
  // Validación previa a la BD: el superadmin pasa los guardas y recibe 400 por datos incompletos.
  const res = await call('/admin-users', { method: 'POST', token: tokenFor('superadmin'), body: {} });
  assert.equal(res.status, 400);
});

test('auditoría restringida a admin y superadmin', async () => {
  assert.equal((await call('/audit-log', { token: tokenFor('editor') })).status, 403);
});

test('/auth/me exige token', async () => {
  assert.equal((await call('/auth/me')).status, 401);
});

test('login valida el formato antes de consultar', async () => {
  const res = await call('/auth/login', { method: 'POST', body: { email: 'no-es-correo', password: 'x' } });
  assert.equal(res.status, 400);
});

test('rutas inexistentes y JSON inválido devuelven errores uniformes', async () => {
  const missing = await call('/no-existe');
  assert.equal(missing.status, 404);
  assert.ok((await missing.json()).error);
  const bad = await fetch(`${baseUrl}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{malo' });
  assert.equal(bad.status, 400);
});
