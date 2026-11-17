import { query } from '../db/pool.js';
import { HttpError } from '../utils/httpError.js';
import { config } from '../config/env.js';
import { optionalText, parseId, requiredText, validateEmail, validateMessageStatus } from '../validators/index.js';
import { sendInstitutionalEmail } from './mailer.js';

export async function submitContactMessage(body) {
  const name = requiredText(body.name, 'name');
  const email = validateEmail(body.email);
  const phone = optionalText(body.phone);
  const subject = requiredText(body.subject, 'subject');
  const message = requiredText(body.message, 'message');

  const recipientEmail = config.institutionalEmail;

  // Envío al correo institucional
  const emailResult = await sendInstitutionalEmail({
    name,
    email,
    phone,
    subject,
    message
  });

  // Guardar en la base de datos para la bandeja administrativa
  const { rows } = await query(
    `INSERT INTO contact_messages (name, email, phone, subject, message, status, recipient_email)
     VALUES ($1, $2, $3, $4, $5, 'unread', $6)
     RETURNING id, name, email, subject, status, recipient_email, created_at`,
    [name, email, phone, subject, message, recipientEmail]
  );

  return {
    success: true,
    message: `Mensaje enviado exitosamente al correo institucional (${recipientEmail})`,
    emailDelivery: emailResult,
    data: rows[0]
  };
}

export async function listContactMessages(filters = {}) {
  const conditions = [];
  const params = [];

  if (filters.status?.trim()) {
    params.push(validateMessageStatus(filters.status.trim()));
    conditions.push(`status = $${params.length}`);
  }

  if (filters.search?.trim()) {
    params.push(`%${filters.search.trim()}%`);
    conditions.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length} OR subject ILIKE $${params.length} OR message ILIKE $${params.length})`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT id, name, email, phone, subject, message, status, recipient_email, created_at, updated_at
    FROM contact_messages
    ${where}
    ORDER BY created_at DESC
  `;

  const { rows } = await query(sql, params);
  return rows;
}

export async function getContactMessage(id) {
  const messageId = parseId(id);
  const { rows } = await query(
    'SELECT * FROM contact_messages WHERE id = $1',
    [messageId]
  );
  if (!rows[0]) throw new HttpError(404, 'Mensaje no encontrado');
  return rows[0];
}

export async function updateMessageStatus(id, status) {
  const messageId = parseId(id);
  const validatedStatus = validateMessageStatus(status);

  const { rows } = await query(
    'UPDATE contact_messages SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [validatedStatus, messageId]
  );

  if (!rows[0]) throw new HttpError(404, 'Mensaje no encontrado');
  return rows[0];
}

export async function deleteContactMessage(id) {
  const messageId = parseId(id);
  const { rowCount } = await query('DELETE FROM contact_messages WHERE id = $1', [messageId]);
  if (rowCount === 0) throw new HttpError(404, 'Mensaje no encontrado');
  return { success: true, message: 'Mensaje eliminado correctamente' };
}

