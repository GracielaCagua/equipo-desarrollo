if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // Archivo .env no presente o no requerido
  }
} else {
  try {
    await import('dotenv/config');
  } catch {
    // dotenv no instalado
  }
}

export const config = {
  port: Number(process.env.PORT || 3000),
  databaseUrl: process.env.DATABASE_URL,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  institutionalEmail: process.env.INSTITUTIONAL_EMAIL || 'contacto.repositorio@universidad.edu'
};
