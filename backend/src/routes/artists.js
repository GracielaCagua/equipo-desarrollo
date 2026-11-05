import { Router } from 'express';
import * as service from '../services/artists.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();
router.get('/', asyncHandler(async (req, res) => res.json(await service.listArtists(req.query))));
router.get('/:id/works', asyncHandler(async (req, res) => res.json(await service.listArtistWorks(req.params.id))));
router.get('/:id', asyncHandler(async (req, res) => res.json(await service.getArtist(req.params.id))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await service.createArtist(req.body))));
router.put('/:id', asyncHandler(async (req, res) => res.json(await service.updateArtist(req.params.id, req.body))));
router.patch('/:id/academic-status', asyncHandler(async (req, res) => res.json(await service.updateAcademicStatus(req.params.id, req.body.academic_status))));
export default router;

