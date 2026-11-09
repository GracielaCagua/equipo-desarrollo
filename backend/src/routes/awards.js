import { Router } from 'express';
import * as service from '../services/awards.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => res.json(await service.listAwards(req.query))));
router.get('/:id', asyncHandler(async (req, res) => res.json(await service.getAward(req.params.id))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await service.createAward(req.body))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await service.updateAward(req.params.id, req.body))));
router.delete('/:id', asyncHandler(async (req, res) => res.json(await service.deleteAward(req.params.id))));

export default router;

