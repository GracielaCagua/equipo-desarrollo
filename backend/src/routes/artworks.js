import { Router } from 'express';
import { receiveFiles } from '../middleware/upload.js';
import * as service from '../services/artworks.js';
import { removeStoredFile } from '../services/storage.js';
import { fail } from '../utils/fail.js';
import { asyncHandler } from '../utils/httpError.js';
import {
  idParam,
  parseArtworkQuery,
  validateArtworkCreate,
  validateArtworkUpdate,
  validatePublicationStatus,
} from '../validators/artworks.js';
import { validateStoredFile } from '../validators/files.js';

const router = Router();

router.get('/', asyncHandler(async (req, res) => {
  res.json(await service.listArtworks(parseArtworkQuery(req.query)));
}));

router.post('/', asyncHandler(async (req, res) => {
  res.status(201).json(await service.createArtwork(validateArtworkCreate(req.body)));
}));

router.get('/:id', asyncHandler(async (req, res) => {
  res.json(await service.getArtwork(idParam(req.params.id)));
}));

router.put('/:id', asyncHandler(async (req, res) => {
  res.json(await service.updateArtwork(idParam(req.params.id), validateArtworkUpdate(req.body)));
}));

router.patch('/:id/status', asyncHandler(async (req, res) => {
  const status = validatePublicationStatus(req.body?.publication_status);
  res.json(await service.setPublicationStatus(idParam(req.params.id), status));
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  await service.deleteArtwork(idParam(req.params.id));
  res.status(204).end();
}));

router.post('/:id/files', asyncHandler(async (req, res) => {
  const workId = idParam(req.params.id);
  await service.getArtwork(workId); // si la obra no existe, no se guarda nada

  const files = await receiveFiles(req, res);
  if (files.length === 0) throw fail(400, 'Envía al menos un archivo en el campo "files"');

  try {
    const prepared = [];
    for (const f of files) {
      const { fileType, extension } = await validateStoredFile(f);
      prepared.push({ originalName: f.originalname, storedName: f.filename, fileType, extension, size: f.size });
    }
    res.status(201).json(await service.addFiles(workId, prepared));
  } catch (err) {
    await Promise.all(files.map((f) => removeStoredFile(f.filename)));
    throw err;
  }
}));

router.delete('/:id/files/:fileId', asyncHandler(async (req, res) => {
  await service.deleteFile(idParam(req.params.id), idParam(req.params.fileId, 'fileId'));
  res.status(204).end();
}));

export default router;