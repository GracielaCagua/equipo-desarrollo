import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

const ISSUER = 'repositorio-obras-api';

export function signAccessToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role, name: user.full_name }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
    issuer: ISSUER
  });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, { issuer: ISSUER, algorithms: ['HS256'] });
}
