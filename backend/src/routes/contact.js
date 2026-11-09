import { Router } from 'express';
import * as service from '../services/contact.js';
import { asyncHandler } from '../utils/httpError.js';

const router = Router();

// Formulario público de contacto y envío a correo institucional
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await service.submitContactMessage(req.body))));

// Bandeja administrativa de mensajes
router.get('/messages', asyncHandler(async (req, res) => res.json(await service.listContactMessages(req.query))));
router.get('/messages/:id', asyncHandler(async (req, res) => res.json(await service.getContactMessage(req.params.id))));
router.patch('/messages/:id/status', asyncHandler(async (req, res) => res.json(await service.updateMessageStatus(req.params.id, req.body.status))));
router.delete('/messages/:id', asyncHandler(async (req, res) => res.json(await service.deleteContactMessage(req.params.id))));

export default router;

