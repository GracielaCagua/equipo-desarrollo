import { randomUUID } from 'node:crypto';
import path from 'node:path';
import multer from 'multer';
import { UPLOAD_DIR, ensureUploadDir } from '../services/storage.js';
import { fail } from '../utils/fail.js';
import { ALLOWED_EXTENSIONS, MAX_UPLOAD_BYTES } from '../validators/files.js';

ensureUploadDir();

const uploader = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 10 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) return cb(fail(415, `Formato no permitido: ${ext || 'sin extensión'}`));
    cb(null, true);
  },
}).array('files', 10);

// Recibe los archivos del campo "files" y convierte los errores de multer en errores HTTP
export function receiveFiles(req, res) {
  return new Promise((resolve, reject) => {
    uploader(req, res, (err) => {
      if (!err) return resolve(req.files ?? []);
      if (err.name === 'MulterError') {
        return reject(fail(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400, err.message));
      }
      return reject(err);
    });
  });
}