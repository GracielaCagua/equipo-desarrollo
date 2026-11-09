import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';
const DEV_SECRET = 'solo-para-desarrollo-cambiar-en-produccion';

const jwtSecret = process.env.JWT_SECRET || (isTest ? 'test-secret' : DEV_SECRET);
if (isProduction && (!process.env.JWT_SECRET || jwtSecret.length < 32)) {
  throw new Error('JWT_SECRET es obligatorio en producción y debe tener al menos 32 caracteres');
}
if (!process.env.JWT_SECRET && !isTest) {
  console.warn('[config] JWT_SECRET no definido: usando secreto de desarrollo.');
}

export const config = {
  env: process.env.NODE_ENV || 'development',
  isProduction,
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  databaseSsl: process.env.DATABASE_SSL === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS || 5),
  loginWindowMinutes: Number(process.env.LOGIN_WINDOW_MINUTES || 15)
};
