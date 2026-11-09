import { Router } from 'express';
import * as service from '../services/works.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => res.json(await service.listWorks(req.query))));
router.get('/:id', asyncHandler(async (req, res) => res.json(await service.getWork(req.params.id))));
router.patch('/:id/commercial-status', asyncHandler(async (req, res) => res.json(await service.updateCommercialStatus(req.params.id, req.body))));

export default router;

