// Crea (o reactiva) el primer superadministrador a partir de variables de entorno.
// Uso: definir ADMIN_EMAIL, ADMIN_PASSWORD y ADMIN_NAME en backend/.env y ejecutar
//      npm run db:seed-admin
// No hay credenciales por defecto en el código.
import { hashPassword, validatePasswordStrength } from '../auth/password.js';
import { validateEmail } from '../validators/index.js';
import { pool } from './pool.js';

async function seed() {
  const email = validateEmail(process.env.ADMIN_EMAIL);
  const password = validatePasswordStrength(process.env.ADMIN_PASSWORD);
  const name = process.env.ADMIN_NAME?.trim() || 'Administrador';

  const { rows } = await pool.query(
    `INSERT INTO admin_users (full_name, email, password_hash, role)
     VALUES ($1, $2, $3, 'superadmin')
     ON CONFLICT ((LOWER(email))) DO UPDATE
       SET role = 'superadmin', is_active = TRUE, password_hash = EXCLUDED.password_hash,
           password_changed_at = NOW(), updated_at = NOW()
     RETURNING id, email, role`,
    [name, email, await hashPassword(password)]
  );
  console.log(`Superadministrador listo: ${rows[0].email} (id ${rows[0].id})`);
}

seed()
  .catch((error) => {
    console.error(`No se pudo crear el administrador: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
