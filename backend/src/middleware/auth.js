import { hasPermission, permissionsFor } from '../auth/permissions.js';
import { verifyAccessToken } from '../auth/tokens.js';
import { HttpError } from '../utils/httpError.js';

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readBearerToken(req) {
  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

// Exige un token válido y deja el usuario en req.user = { id, role, name, permissions }.
export function authenticate(req, _res, next) {
  const token = readBearerToken(req);
  if (!token) return next(new HttpError(401, 'Debe iniciar sesión'));
  try {
    const payload = verifyAccessToken(token);
    req.user = { id: Number(payload.sub), role: payload.role, name: payload.name, permissions: permissionsFor(payload.role) };
    return next();
  } catch {
    return next(new HttpError(401, 'Sesión inválida o expirada'));
  }
}

// Usar después de authenticate.
export function requirePermission(...permissions) {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Debe iniciar sesión'));
    const allowed = permissions.every((permission) => hasPermission(req.user.role, permission));
    return allowed ? next() : next(new HttpError(403, 'No tiene permisos para realizar esta acción'));
  };
}

// Lecturas públicas, escrituras protegidas. Pensado para módulos cuyo GET
// alimenta el sitio público (categorías, artistas, obras, premios, exposiciones).
export function protectWrites(...permissions) {
  const guard = requirePermission(...permissions);
  return (req, res, next) => {
    if (READ_METHODS.has(req.method)) return next();
    return authenticate(req, res, (error) => (error ? next(error) : guard(req, res, next)));
  };
}

// Protege todo el router (lectura y escritura). Para módulos solo administrativos.
export function protectAll(...permissions) {
  const guard = requirePermission(...permissions);
  return (req, res, next) => authenticate(req, res, (error) => (error ? next(error) : guard(req, res, next)));
}
