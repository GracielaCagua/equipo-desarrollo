import test from 'node:test';
import assert from 'node:assert/strict';
import { config } from '../src/config/env.js';
import { sendInstitutionalEmail } from '../src/services/mailer.js';
import {
  parseId,
  parseIdArray,
  requiredText,
  validateCommercialStatus,
  validateDate,
  validateEmail,
  validateMessageStatus
} from '../src/validators/index.js';

test('mailer dispatches email to configured institutional email', async () => {
  const result = await sendInstitutionalEmail({
    name: 'Juan Perez',
    email: 'juan@example.com',
    phone: '3001234567',
    subject: 'Consulta sobre obra expuesta',
    message: 'Deseo más información sobre la exposición de artes plásticas.'
  });

  assert.equal(result.sent, true);
  assert.equal(result.recipient, config.institutionalEmail);
  assert.ok(result.messageId);
  assert.ok(result.timestamp);
});

test('awards module validates required fields and dates', () => {
  assert.throws(() => requiredText('', 'name'), /name es obligatorio/);
  assert.throws(() => validateDate('invalid-date', 'award_date'), /formato de fecha válido/);
  assert.equal(validateDate('2026-05-15', 'award_date'), '2026-05-15');
  assert.equal(parseId('10', 'artist_id'), 10);
  assert.deepEqual(parseIdArray([1, 2, 3]), [1, 2, 3]);
});

test('exhibitions module validates title, location, and dates', () => {
  assert.throws(() => requiredText('   ', 'title'), /title es obligatorio/);
  assert.throws(() => requiredText('', 'location'), /location es obligatorio/);
  assert.equal(validateDate('2026-03-01', 'start_date'), '2026-03-01');
  assert.equal(validateDate('2026-04-15', 'end_date'), '2026-04-15');
});

test('commercial status validation updates sold/not_sold correctly', () => {
  assert.equal(validateCommercialStatus('sold'), 'sold');
  assert.equal(validateCommercialStatus('not_sold'), 'not_sold');
  assert.equal(validateCommercialStatus(true), 'sold');
  assert.equal(validateCommercialStatus(false), 'not_sold');
  assert.throws(() => validateCommercialStatus('en_negociacion'), /commercial_status debe ser sold o not_sold/);
});

test('commercial status parsing handles boolean values and strings', () => {
  const testCases = [
    { input: true, expected: 'sold' },
    { input: false, expected: 'not_sold' },
    { input: 'sold', expected: 'sold' },
    { input: 'not_sold', expected: 'not_sold' }
  ];

  for (const { input, expected } of testCases) {
    assert.equal(validateCommercialStatus(input), expected);
  }
});

test('contact form validation rejects invalid fields and formats', () => {
  assert.throws(() => requiredText('', 'name'), /name es obligatorio/);
  assert.throws(() => validateEmail('usuario-sin-arroba'), /formato válido/);
  assert.throws(() => requiredText('', 'subject'), /subject es obligatorio/);
  assert.throws(() => requiredText('', 'message'), /message es obligatorio/);
  assert.equal(validateEmail('interesado@universidad.edu'), 'interesado@universidad.edu');
});

test('message status validation for admin inbox transitions', () => {
  const allowed = ['unread', 'read', 'responded', 'archived'];
  for (const st of allowed) {
    assert.equal(validateMessageStatus(st), st);
  }
  assert.throws(() => validateMessageStatus('unknown_status'), /status debe ser unread, read, responded o archived/);
});

test('exposed works filter parameter validation', () => {
  assert.equal(parseId('5', 'category_id'), 5);
  assert.equal(parseId('12', 'subcategory_id'), 12);
  assert.equal(validateCommercialStatus('sold'), 'sold');
  assert.throws(() => parseId('-1', 'category_id'), /debe ser un entero positivo/);
});
