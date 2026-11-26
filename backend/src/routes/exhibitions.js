import { Router } from 'express';
import * as service from '../services/exhibitions.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();

// Sección especial de obras expuestas (con filtros por categorías y subcategorías)
router.get('/exposed-works', asyncHandler(async (req, res) => res.json(await service.listExposedWorks(req.query))));

// CRUD de exposiciones
router.get('/', asyncHandler(async (req, res) => res.json(await service.listExhibitions(req.query))));
router.get('/:id', asyncHandler(async (req, res) => res.json(await service.getExhibition(req.params.id))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await service.createExhibition(req.body))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await service.updateExhibition(req.params.id, req.body))));
router.delete('/:id', asyncHandler(async (req, res) => res.json(await service.deleteExhibition(req.params.id))));

export default router;

