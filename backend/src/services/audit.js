import { query } from '../db/pool.js';

// La auditoría nunca debe romper la operación principal.
export async function logAction({ userId = null, action, entity = null, entityId = null, details = null, ip = null }) {
  try {
    await query(
      'INSERT INTO audit_log (admin_user_id, action, entity, entity_id, details, ip_address) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, action, entity, entityId, details ? JSON.stringify(details) : null, ip]
    );
  } catch (error) {
    console.error('[audit] no se pudo registrar la acción', action, error.message);
  }
}

export async function listAudit({ limit = 100 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const { rows } = await query(
    `SELECT l.*, u.full_name AS user_name, u.email AS user_email
     FROM audit_log l LEFT JOIN admin_users u ON u.id = l.admin_user_id
     ORDER BY l.created_at DESC LIMIT $1`,
    [safeLimit]
  );
  return rows;
}
