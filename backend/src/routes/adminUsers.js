import { Router } from 'express';
import * as service from '../services/adminUsers.js';
import { asyncHandler } from '../utils/httpError.js';

// Montado en app.js detrás de protectAll(PERMISSIONS.USERS_MANAGE).
const router = Router();
router.get('/', asyncHandler(async (_req, res) => res.json(await service.listAdminUsers())));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await service.createAdminUser(req.body, req.user))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await service.updateAdminUser(req.params.id, req.body, req.user))));
router.patch('/:id/status', asyncHandler(async (req, res) => res.json(await service.setAdminUserStatus(req.params.id, req.body.is_active, req.user))));
router.patch('/:id/password', asyncHandler(async (req, res) => res.json(await service.resetAdminUserPassword(req.params.id, req.body.password, req.user))));
export default router;
