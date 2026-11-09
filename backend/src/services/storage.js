
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || 'uploads');

export function ensureUploadDir() {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export const fileUrl = (storedName) => `/uploads/${storedName}`;

export async function removeStoredFile(storedName) {
  await fsp.rm(path.join(UPLOAD_DIR, path.basename(storedName)), { force: true });
}