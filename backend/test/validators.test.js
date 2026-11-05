import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAcademicStatus, validateEmail } from '../src/validators/index.js';

test('accepts supported academic statuses', () => {
  assert.equal(validateAcademicStatus('student'), 'student');
  assert.equal(validateAcademicStatus('graduate'), 'graduate');
});

test('rejects unsupported academic statuses and invalid emails', () => {
  assert.throws(() => validateAcademicStatus('alumni'), /student o graduate/);
  assert.throws(() => validateEmail('not-an-email'), /formato válido/);
});

