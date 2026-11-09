import fs from 'node:fs/promises';
import path from 'node:path';
import { fail } from '../utils/fail.js';

const MB = 1024 * 1024;

// Formatos y tamaños máximos por tipo (confirmar con el tutor)
export const FILE_TYPES = {
  image: { extensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'], maxBytes: 10 * MB },
  video: { extensions: ['.mp4', '.webm', '.mov'], maxBytes: 200 * MB },
  model3d: { extensions: ['.glb', '.gltf', '.obj', '.fbx', '.stl'], maxBytes: 100 * MB },
  document: { extensions: ['.pdf'], maxBytes: 20 * MB },
};

export const ALLOWED_EXTENSIONS = new Set(Object.values(FILE_TYPES).flatMap((t) => t.extensions));
export const MAX_UPLOAD_BYTES = Math.max(...Object.values(FILE_TYPES).map((t) => t.maxBytes));

export function detectFileType(filename = '') {
  const extension = path.extname(filename).toLowerCase();
  for (const [fileType, rule] of Object.entries(FILE_TYPES)) {
    if (rule.extensions.includes(extension)) return { fileType, extension };
  }
  return null;
}

const startsWith = (buf, bytes, offset = 0) => bytes.every((b, i) => buf[offset + i] === b);
const ascii = (s) => [...s].map((c) => c.charCodeAt(0));


export function hasValidSignature(extension, h) {
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return startsWith(h, [0xff, 0xd8, 0xff]);
    case '.png':
      return startsWith(h, [0x89, ...ascii('PNG'), 0x0d, 0x0a, 0x1a, 0x0a]);
    case '.gif':
      return startsWith(h, ascii('GIF87a')) || startsWith(h, ascii('GIF89a'));
    case '.webp':
      return startsWith(h, ascii('RIFF')) && startsWith(h, ascii('WEBP'), 8);
    case '.pdf':
      return startsWith(h, ascii('%PDF'));
    case '.mp4':
    case '.mov':
      return startsWith(h, ascii('ftyp'), 4);
    case '.webm':
      return startsWith(h, [0x1a, 0x45, 0xdf, 0xa3]);
    case '.glb':
      return startsWith(h, ascii('glTF'));
    default:
      return true; // obj, stl, fbx, gltf: sin firma fiable
  }
}

// Valida un archivo ya guardado por multer. Devuelve { fileType, extension }
export async function validateStoredFile(file) {
  const detected = detectFileType(file.originalname);
  if (!detected) throw fail(415, `Formato no permitido: ${file.originalname}`);

  const { maxBytes } = FILE_TYPES[detected.fileType];
  if (file.size === 0) throw fail(400, `El archivo ${file.originalname} está vacío`);
  if (file.size > maxBytes) {
    throw fail(413, `${file.originalname} supera el máximo de ${maxBytes / MB} MB para ${detected.fileType}`);
  }

  const handle = await fs.open(file.path, 'r');
  try {
    const header = Buffer.alloc(16);
    await handle.read(header, 0, 16, 0);
    if (!hasValidSignature(detected.extension, header)) {
      throw fail(415, `El contenido de ${file.originalname} no coincide con su extensión`);
    }
  } finally {
    await handle.close();
  }
  return detected;
}