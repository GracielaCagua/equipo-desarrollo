import express from 'express';
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

export const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(cors({ origin: config.frontendUrl.split(',').map((url) => url.trim()) }));
app.use(express.json({ limit: '1mb' }));

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

app.use('/api', notFound);
app.use(errorHandler);
app.use('/api/categories', categories);
app.use('/api/subcategories', subcategories);
app.use('/api/artists', artists);
app.use('/api/works', artworksRouter);
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(errorHandler);
