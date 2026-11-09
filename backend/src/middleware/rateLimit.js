import { HttpError } from '../utils/httpError.js';

// Limitador en memoria por IP + clave (p. ej. email). Suficiente para una sola
// instancia; con varias réplicas debe reemplazarse por un almacén compartido.
export function createLoginLimiter({ maxAttempts, windowMs }) {
  const attempts = new Map();

  function key(req) {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return `${req.ip}|${email}`;
  }

  function middleware(req, _res, next) {
    const entry = attempts.get(key(req));
    if (entry && entry.resetAt > Date.now() && entry.count >= maxAttempts) {
      const minutes = Math.ceil((entry.resetAt - Date.now()) / 60000);
      return next(new HttpError(429, `Demasiados intentos. Intente de nuevo en ${minutes} minuto(s)`));
    }
    return next();
  }

  middleware.registerFailure = (req) => {
    const k = key(req);
    const now = Date.now();
    const entry = attempts.get(k);
    if (!entry || entry.resetAt <= now) attempts.set(k, { count: 1, resetAt: now + windowMs });
    else entry.count += 1;
  };

  middleware.reset = (req) => attempts.delete(key(req));

  return middleware;
}
