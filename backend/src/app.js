import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import cors from 'cors';
import { config } from './config/env.js';
import { PERMISSIONS } from './auth/permissions.js';
import { protectAll, protectWrites } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import auth from './routes/auth.js';
import adminUsers from './routes/adminUsers.js';
import categories from './routes/categories.js';
import subcategories from './routes/subcategories.js';
import artists from './routes/artists.js';
import { listAudit } from './services/audit.js';
import { asyncHandler } from './utils/httpError.js';
import awards from './routes/awards.js';
import exhibitions from './routes/exhibitions.js';
import works from './routes/works.js';
import artworks from './routes/artworks.js';
import contact from './routes/contact.js';
import dashboard from './routes/dashboard.js';
import { UPLOAD_DIR, ensureUploadDir } from './services/storage.js';

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({ origin: config.frontendUrl.split(',').map((url) => url.trim()) }));
app.use(express.json({ limit: '1mb' }));
ensureUploadDir();
app.use('/uploads', express.static(UPLOAD_DIR, { fallthrough: false }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// Autenticación y administración de cuentas
app.use('/api/auth', auth);
app.use('/api/admin-users', protectAll(PERMISSIONS.USERS_MANAGE), adminUsers);
app.get('/api/audit-log', protectAll(PERMISSIONS.AUDIT_READ), asyncHandler(async (req, res) => res.json(await listAudit(req.query))));

// Módulos de catálogo: GET público, escritura solo para administradores con permiso.
// Al integrar otros módulos, montar con el mismo patrón (ver docs/API_CONVENCIONES.md):
//   app.use('/api/works', protectWrites(PERMISSIONS.WORKS_WRITE), works);
//   app.use('/api/awards', protectWrites(PERMISSIONS.EVENTS_WRITE), awards);
//   app.use('/api/exhibitions', protectWrites(PERMISSIONS.EVENTS_WRITE), exhibitions);
//   contact: POST / público; /messages con protectAll(PERMISSIONS.MESSAGES_MANAGE).
app.use('/api/categories', protectWrites(PERMISSIONS.CATALOG_WRITE), categories);
app.use('/api/subcategories', protectWrites(PERMISSIONS.CATALOG_WRITE), subcategories);
app.use('/api/artists', protectWrites(PERMISSIONS.CATALOG_WRITE), artists);
app.use('/api/awards', protectWrites(PERMISSIONS.EVENTS_WRITE), awards);
app.use('/api/exhibitions', protectWrites(PERMISSIONS.EVENTS_WRITE), exhibitions);
app.use('/api/works', protectWrites(PERMISSIONS.WORKS_WRITE), works);
app.use('/api/artworks', protectWrites(PERMISSIONS.WORKS_WRITE), artworks);
app.use('/api/contact', contact);
app.use('/api/dashboard', protectAll(PERMISSIONS.WORKS_WRITE), dashboard);
app.use('/api', notFound);

const repositoryDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const publicDist = path.join(repositoryDir, 'frontend', 'dist');
const adminDist = path.join(repositoryDir, 'admin', 'dist');

if (fs.existsSync(adminDist)) {
  app.use('/admin/assets', express.static(path.join(adminDist, 'assets')));
  app.use('/admin/favicon.svg', express.static(path.join(adminDist, 'favicon.svg')));
  app.get('/login', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  app.get('/admin', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  app.get('/admin/', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  app.get('/admin/*', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  app.get('/usuario', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
  app.get('/usuario/*', (_req, res) => res.sendFile(path.join(adminDist, 'index.html')));
}

if (fs.existsSync(publicDist)) {
  app.use(express.static(publicDist));
  app.get('*', (_req, res) => res.sendFile(path.join(publicDist, 'index.html')));
}

app.use(errorHandler);
