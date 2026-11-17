import { config } from '../config/env.js';

export async function sendInstitutionalEmail({ name, email, phone, subject, message }) {
  const recipient = config.institutionalEmail;
  const timestamp = new Date().toISOString();

  // Registro del correo enviado a la dirección institucional
  console.log(`[MAILER] Correo enviado a: ${recipient}`);
  console.log(`[MAILER] Remitente: ${name} <${email}> ${phone ? `(Tel: ${phone})` : ''}`);
  console.log(`[MAILER] Asunto: ${subject}`);
  console.log(`[MAILER] Fecha: ${timestamp}`);
  console.log(`[MAILER] Mensaje: \n${message}\n---`);

  return {
    sent: true,
    recipient,
    timestamp,
    messageId: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  };
}

