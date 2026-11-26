import test from 'node:test';
import assert from 'node:assert/strict';
import {
  optionalDate,
  parseId,
  parseIdArray,
  requiredText,
  validateAcademicStatus,
  validateCommercialStatus,
  validateDate,
  validateEmail,
  validateMessageStatus
} from '../src/validators/index.js';

test('accepts supported academic statuses', () => {
  assert.equal(validateAcademicStatus('student'), 'student');
  assert.equal(validateAcademicStatus('graduate'), 'graduate');
});

test('rejects unsupported academic statuses and invalid emails', () => {
  assert.throws(() => validateAcademicStatus('alumni'), /student o graduate/);
  assert.throws(() => validateEmail('not-an-email'), /formato válido/);
});

test('validates commercial status properly', () => {
  assert.equal(validateCommercialStatus('sold'), 'sold');
  assert.equal(validateCommercialStatus('not_sold'), 'not_sold');
  assert.equal(validateCommercialStatus(true), 'sold');
  assert.equal(validateCommercialStatus(false), 'not_sold');
  assert.throws(() => validateCommercialStatus('reserved'), /commercial_status debe ser sold o not_sold/);
});

test('validates message status properly', () => {
  assert.equal(validateMessageStatus('unread'), 'unread');
  assert.equal(validateMessageStatus('read'), 'read');
  assert.equal(validateMessageStatus('responded'), 'responded');
  assert.equal(validateMessageStatus('archived'), 'archived');
  assert.throws(() => validateMessageStatus('deleted'), /status debe ser unread, read, responded o archived/);
});

test('validates dates and optional dates', () => {
  assert.equal(validateDate('2026-11-08'), '2026-11-08');
  assert.equal(optionalDate(null), null);
  assert.equal(optionalDate(''), null);
  assert.equal(optionalDate('2026-12-31'), '2026-12-31');
  assert.throws(() => validateDate('not-a-date'), /formato de fecha válido/);
});

test('parses id array and deduplicates', () => {
  assert.deepEqual(parseIdArray(null), []);
  assert.deepEqual(parseIdArray([1, '2', 2, '3']), [1, 2, 3]);
  assert.throws(() => parseIdArray('not-an-array'), /debe ser una lista/);
  assert.throws(() => parseIdArray([1, -5]), /entero positivo/);
});
