# Convenciones de API

Acuerdos obligatorios para todos los módulos de la API REST.

## URLs y métodos

- Prefijo único: `/api`. Recursos en **inglés, plural y kebab-case**: `/api/works`, `/api/admin-users`.
- Identificadores en la ruta: `/api/works/:id`. Subrecursos: `/api/artists/:id/works`.
- Métodos:

| Método | Uso | Éxito |
|---|---|---|
| `GET` | Listar o consultar | `200` |
| `POST` | Crear | `201` + recurso creado |
| `PUT` | Reemplazar los campos editables | `200` + recurso |
| `PATCH` | Cambio puntual de estado: `/:id/status`, `/:id/academic-status` | `200` + recurso |
| `DELETE` | Eliminar (preferir desactivar con `is_active`) | `200` o `204` |

- Filtros, búsqueda y paginación por **query string**: `?search=&category_id=&page=1&limit=20`.

## Formato JSON

- Campos en **snake_case**, igual que las columnas: `category_id`, `is_active`, `created_at`.
- Fechas en ISO 8601 (`2026-11-08T22:00:00.000Z`); fechas sin hora como `YYYY-MM-DD`.
- Booleanos reales (`true`/`false`), nunca `"true"` ni `1`.
- Listas: arreglo JSON. Si se pagina: `{ "data": [...], "total": 120, "page": 1, "limit": 20 }`.
- Nunca devolver `password_hash` ni datos sensibles.

## Errores

Todas las respuestas de error tienen **la misma forma**:

```json
{ "error": "Mensaje legible en español" }
```

| Código | Cuándo |
|---|---|
| `400` | Validación fallida o JSON inválido |
| `401` | Sin token, token inválido o expirado |
| `403` | Autenticado pero sin permiso |
| `404` | Recurso o ruta inexistente |
| `409` | Conflicto (duplicado, violación de unicidad, `23505`) |
| `429` | Demasiados intentos |
| `500` | Error inesperado (el detalle solo va al log del servidor) |

En código: `throw new HttpError(400, 'title es obligatorio')` dentro de servicios/validadores y envolver los handlers con `asyncHandler`. El `errorHandler` global hace el resto.

## Autenticación

- Encabezado: `Authorization: Bearer <token>` obtenido en `POST /api/auth/login`.
- **Lecturas públicas** (catálogo visible en el sitio): montar con `protectWrites(PERMISSION)`.
- **Módulos solo administrativos** (bandeja, usuarios, auditoría): `protectAll(PERMISSION)`.
- Si una ruta necesita un permiso distinto al del router, encadenar `authenticate, requirePermission(...)` en esa ruta.
- Un permiso nuevo se agrega **solo** en `backend/src/auth/permissions.js`. El frontend lo recibe en `permissions` de `/api/auth/me` (ver [INTEGRACION_FRONTEND.md](INTEGRACION_FRONTEND.md)).

## Endpoints de autenticación

| Método | Ruta | Acceso | Uso |
|---|---|---|---|
| POST | `/api/auth/login` | Público | `{ email, password }` → `{ token, user }` |
| GET | `/api/auth/me` | Autenticado | Perfil y `permissions` |
| POST | `/api/auth/change-password` | Autenticado | `{ current_password, new_password }` |
| POST | `/api/auth/logout` | Autenticado | `204` (el cliente borra el token) |
| GET/POST | `/api/admin-users` | `users:manage` | Listar / crear `{ full_name, email, role, password }` |
| PUT | `/api/admin-users/:id` | `users:manage` | `{ full_name, email, role }` |
| PATCH | `/api/admin-users/:id/status` | `users:manage` | `{ is_active }` |
| PATCH | `/api/admin-users/:id/password` | `users:manage` | `{ password }` |
| GET | `/api/audit-log?limit=100` | `audit:read` | Últimas acciones |

## Estructura de un módulo nuevo

```text
backend/src/routes/<recurso>.js      Router de Express
backend/src/services/<recurso>.js    Lógica + SQL parametrizado ($1, $2…), nunca concatenar valores
backend/sql/00N_<modulo>.sql         Migración nueva (no editar las existentes)
backend/test/<recurso>.test.js       Pruebas con node:test
frontend/src/pages/<Recurso>Page.jsx Página; llamadas a la API solo vía services/api.js
```
