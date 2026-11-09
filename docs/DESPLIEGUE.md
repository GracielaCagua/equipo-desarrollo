# Entorno de desarrollo y despliegue

## Desarrollo local

Requisitos: Node.js 20+ (`.nvmrc`), npm y PostgreSQL 14+ (instalado o con Docker).

```bash
# 1. Base de datos (opción Docker; si ya tiene PostgreSQL, solo cree la base repositorio_obras)
docker compose up -d

# 2. Variables de entorno
cp backend/.env.example backend/.env      # completar JWT_SECRET y ADMIN_*

# 3. Dependencias, esquema y primer administrador
npm run install:all
npm run db:migrate
npm run db:seed-admin

# 4. Ejecutar (dos terminales)
npm run dev:backend      # http://localhost:3000/api
npm run dev:frontend     # http://localhost:5173
```

Pruebas: `npm test`. Compilación del frontend: `npm run build`.

## Variables de entorno (backend)

| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL |
| `DATABASE_SSL` | En la nube | `true` para Render, Railway, Neon, Supabase |
| `JWT_SECRET` | Sí en producción | Mínimo 32 caracteres aleatorios. La API no arranca sin él en `NODE_ENV=production` |
| `JWT_EXPIRES_IN` | No | Duración de la sesión (`8h`) |
| `FRONTEND_URL` | Sí | Origen(es) permitidos por CORS, separados por coma |
| `NODE_ENV` | Sí en producción | `production` |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Solo para `db:seed-admin` | Primer superadministrador; eliminar de la configuración tras usarlas |

Frontend: `VITE_API_URL` (se inyecta al compilar).

## Despliegue sugerido

**Base de datos:** PostgreSQL gestionado (Render, Railway, Neon o Supabase). Copiar su `DATABASE_URL` y usar `DATABASE_SSL=true`.

**API (Render / Railway):**
- Directorio raíz: `backend`
- Build: `npm ci`
- Start: `npm run db:migrate && npm start` (o usar `backend/Dockerfile`, que hace lo mismo)
- Definir las variables de la tabla anterior.
- Una sola vez: ejecutar `npm run db:seed-admin` desde la consola del servicio con `ADMIN_*` definidas.

**Frontend (Vercel / Netlify / Render Static):**
- Directorio raíz: `frontend`
- Build: `npm ci && npm run build` · Publicar: `dist`
- `VITE_API_URL=https://<api>/api`
- Agregar la URL final del frontend a `FRONTEND_URL` de la API.

## Lista de verificación antes de producción

- [ ] `JWT_SECRET` aleatorio y distinto al de desarrollo.
- [ ] `NODE_ENV=production`, HTTPS en API y frontend.
- [ ] `FRONTEND_URL` restringido al dominio real.
- [ ] Superadmin creado y variables `ADMIN_*` eliminadas.
- [ ] `npm test` en verde y migraciones aplicadas.
- [ ] Respaldo automático de la base habilitado en el proveedor.
