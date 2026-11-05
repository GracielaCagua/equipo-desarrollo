import { Router } from 'express';
import * as service from '../services/subcategories.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();
router.get('/', asyncHandler(async (req, res) => res.json(await service.listSubcategories(req.query.category_id))));
router.get('/:id', asyncHandler(async (req, res) => res.json(await service.getSubcategory(req.params.id))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await service.createSubcategory(req.body))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await service.updateSubcategory(req.params.id, req.body))));
router.patch('/:id/status', asyncHandler(async (req, res) => res.json(await service.setSubcategoryStatus(req.params.id, req.body.is_active))));
export default router;

