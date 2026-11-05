import { Router } from 'express';
import * as service from '../services/categories.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();
router.get('/', asyncHandler(async (req, res) => res.json(await service.listCategories(req.query.search))));
router.get('/:id', asyncHandler(async (req, res) => res.json(await service.getCategory(req.params.id))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await service.createCategory(req.body))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await service.updateCategory(req.params.id, req.body))));
router.patch('/:id/status', asyncHandler(async (req, res) => res.json(await service.setCategoryStatus(req.params.id, req.body.is_active))));
export default router;

