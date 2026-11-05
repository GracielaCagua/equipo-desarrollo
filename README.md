# Módulo de categorías, subcategorías y artistas

Módulo independiente para administrar la clasificación y los perfiles de artistas del repositorio universitario de obras. La API persiste las operaciones en PostgreSQL; no se usan datos ficticios.

## Tecnologías

- Node.js, Express y PostgreSQL.
- React 18 y Vite.
- JavaScript ES modules.

## Estructura

```text
backend/
  src/config, db, middleware, routes, services, validators
  sql/001_init.sql
  test/
frontend/
  src/components, pages, services
```

## Instalación y configuración

Requisitos: Node.js 18+, npm y PostgreSQL 14+.

1. Cree una base de datos, por ejemplo `repositorio_obras`.
2. Ejecute `backend/sql/001_init.sql` sobre esa base.
3. Copie `backend/.env.example` a `backend/.env` y ajuste `DATABASE_URL`. No versionar `.env`.
4. Instale dependencias: `npm run install:all`.
5. Inicie la API: `npm run dev:backend`.
6. En otra terminal, inicie el frontend: `npm run dev:frontend`.
7. Abra `http://localhost:5173`.

También puede definir `frontend/.env` con `VITE_API_URL` si la API no está en `http://localhost:3000/api`.

## API REST

| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/api/categories` | Listar, buscar y crear categorías |
| GET/PUT | `/api/categories/:id` | Consultar y editar una categoría |
| PATCH | `/api/categories/:id/status` | Activar/desactivar (`{"is_active": false}`) |
| GET/POST | `/api/subcategories` | Filtrar por `category_id` y crear |
| GET/PUT | `/api/subcategories/:id` | Consultar y editar |
| PATCH | `/api/subcategories/:id/status` | Activar/desactivar |
| GET/POST | `/api/artists` | Buscar/filtrar y registrar artistas |
| GET/PUT | `/api/artists/:id` | Perfil y edición |
| PATCH | `/api/artists/:id/academic-status` | Cambiar a `student` o `graduate` |
| GET | `/api/artists/:id/works` | Obras asociadas |

Filtros de artistas: `academic_status`, `search`, `category_id` y `subcategory_id`.

## Integración

- **Desarrollador 1:** proteger las rutas `/api` administrativas con el middleware de autenticación compartido. No se creó login local ni usuario ficticio.
- **Desarrollador 2:** `works` es un contrato mínimo de integración con `artist_id`, `category_id`, `subcategory_id` y `title`. El módulo multimedia y los demás campos de obras deben permanecer en su módulo; puede ampliar esta tabla o migrar sus datos respetando las claves foráneas. PostgreSQL valida que la subcategoría pertenezca a la categoría indicada.
- **Desarrollador 4:** la interfaz administrativa puede montarse como una sección del panel existente; las páginas consumen únicamente la API.
- **Desarrollador 5:** el frontend público puede reutilizar los endpoints GET para filtros y perfiles, sin usar endpoints administrativos de escritura.

Las categorías y subcategorías usan `ON DELETE RESTRICT` para impedir pérdidas accidentales de información relacionada. Un estudiante se gradúa actualizando el mismo registro, conservando su id y sus obras.

## Pruebas

Ejecute `npm test` para las validaciones unitarias. Las operaciones de integración requieren PostgreSQL configurado y pueden verificarse con los endpoints descritos arriba; este repositorio no incluye credenciales ni una base remota.
