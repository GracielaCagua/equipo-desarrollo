import { Router } from 'express';
import { config } from '../config/env.js';
import { authenticate } from '../middleware/auth.js';
import { createLoginLimiter } from '../middleware/rateLimit.js';
import * as service from '../services/auth.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();
const limiter = createLoginLimiter({ maxAttempts: config.loginMaxAttempts, windowMs: config.loginWindowMinutes * 60000 });

router.post('/login', limiter, asyncHandler(async (req, res) => {
  try {
    const result = await service.login(req.body, req.ip);
    limiter.reset(req);
    res.json(result);
  } catch (error) {
    if (error.status === 401) limiter.registerFailure(req);
    throw error;
  }
}));

router.get('/me', authenticate, asyncHandler(async (req, res) => res.json(await service.getProfile(req.user.id))));
router.post('/change-password', authenticate, asyncHandler(async (req, res) => res.json(await service.changePassword(req.user.id, req.body, req.ip))));

// JWT sin estado: el cliente descarta el token. Se mantiene el endpoint para una API uniforme.
router.post('/logout', authenticate, (_req, res) => res.status(204).end());

export default router;
