import { Router } from 'express';
import { getDashboardStats } from '../services/dashboard.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();

router.get('/stats', asyncHandler(async (_req, res) => {
  res.json(await getDashboardStats());
}));

export default router;
