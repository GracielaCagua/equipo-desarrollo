import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseArtworkQuery,
  validateArtworkCreate,
  validateArtworkUpdate,
  validatePublicationStatus,
} from '../src/validators/artworks.js';
import { detectFileType, hasValidSignature } from '../src/validators/files.js';

const base = { title: ' Obra ', artist_id: 1, category_id: 2, subcategory_id: 3 };

test('validateArtworkCreate limpia y aplica borrador por defecto', () => {
  const r = validateArtworkCreate(base);
  assert.equal(r.title, 'Obra');
  assert.equal(r.publication_status, 'draft');
});

test('validateArtworkCreate rechaza datos inválidos', () => {
  assert.throws(() => validateArtworkCreate({ ...base, title: '  ' }), { status: 400 });
  assert.throws(() => validateArtworkCreate({ ...base, artist_id: 'x' }), { status: 400 });
  assert.throws(() => validateArtworkCreate({ ...base, subcategory_id: undefined }), { status: 400 });
  assert.throws(() => validateArtworkCreate({ ...base, publication_status: 'otro' }), { status: 400 });
});

test('validateArtworkUpdate exige al menos un campo', () => {
  assert.throws(() => validateArtworkUpdate({}), { status: 400 });
  assert.deepEqual(validateArtworkUpdate({ title: 'Nuevo' }), { title: 'Nuevo' });
});

test('validatePublicationStatus acepta solo los 3 estados', () => {
  for (const s of ['draft', 'published', 'archived']) assert.equal(validatePublicationStatus(s), s);
  assert.throws(() => validatePublicationStatus('vendida'), { status: 400 });
});

test('parseArtworkQuery aplica valores por defecto y límites', () => {
  const q = parseArtworkQuery({});
  assert.equal(q.page, 1);
  assert.equal(q.limit, 10);
  assert.throws(() => parseArtworkQuery({ limit: 500 }), { status: 400 });
  assert.throws(() => parseArtworkQuery({ file_type: 'zip' }), { status: 400 });
});

test('detectFileType clasifica por extensión', () => {
  assert.equal(detectFileType('a.PNG').fileType, 'image');
  assert.equal(detectFileType('a.glb').fileType, 'model3d');
  assert.equal(detectFileType('a.mp4').fileType, 'video');
  assert.equal(detectFileType('a.exe'), null);
});

test('hasValidSignature detecta contenido falso', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(hasValidSignature('.png', png), true);
  assert.equal(hasValidSignature('.png', Buffer.from('no soy png......')), false);
});