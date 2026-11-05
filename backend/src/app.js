import express from 'express';
import cors from 'cors';
import { config } from './config/env.js';
import categories from './routes/categories.js';
import subcategories from './routes/subcategories.js';
import artists from './routes/artists.js';
import { errorHandler } from './middleware/errorHandler.js';

export const app = express();
app.use(cors({ origin: config.frontendUrl }));
app.use(express.json());
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/categories', categories);
app.use('/api/subcategories', subcategories);
app.use('/api/artists', artists);
app.use(errorHandler);

