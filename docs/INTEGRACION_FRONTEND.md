# Integración del frontend con la autenticación

Guía para el **panel administrativo (Desarrollador 4)** y el **sitio público (Desarrollador 5)**. La API ya está protegida; este documento explica cómo consumirla.

## Importante

Desde esta rama, las escrituras (`POST`, `PUT`, `PATCH`, `DELETE`) de categorías, subcategorías y artistas **responden `401` si no se envía token**. Los `GET` siguen siendo públicos, así que el sitio público no requiere cambios.

## 1. Iniciar sesión

```http
POST /api/auth/login
Content-Type: application/json

{ "email": "admin@universidad.edu", "password": "********" }
```

Respuesta `200`:

```json
{
  "token": "eyJhbGciOi...",
  "user": {
    "id": 1,
    "full_name": "Admin",
    "email": "admin@universidad.edu",
    "role": "superadmin",
    "permissions": ["catalog:write", "works:write", "events:write", "messages:manage", "users:manage", "audit:read"]
  }
}
```

Errores: `400` datos inválidos, `401` "Correo o contraseña incorrectos", `403` cuenta desactivada, `429` demasiados intentos.

## 2. Enviar el token

En cada petición administrativa:

```http
Authorization: Bearer <token>
```

Ejemplo mínimo para `frontend/src/services/api.js`:

```js
const TOKEN_KEY = 'repositorio.token';

async function request(path, options = {}) {
  const token = sessionStorage.getItem(TOKEN_KEY);
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (response.status === 401) sessionStorage.removeItem(TOKEN_KEY); // sesión expirada → volver al login
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación');
  return data;
}
```

Se recomienda `sessionStorage` (la sesión termina al cerrar el navegador).

## 3. Recuperar la sesión al recargar

`GET /api/auth/me` con el token devuelve el mismo objeto `user` del login. Si responde `401`, borrar el token y mostrar el login.

## 4. Mostrar u ocultar opciones por permiso

Usar `user.permissions` (no el nombre del rol):

| Sección del panel | Permiso |
|---|---|
| Categorías, subcategorías, artistas | `catalog:write` |
| Obras, multimedia, estado comercial | `works:write` |
| Premios, exposiciones | `events:write` |
| Bandeja de mensajes | `messages:manage` |
| Administradores | `users:manage` |
| Auditoría | `audit:read` |

```js
const can = (permission) => user?.permissions.includes(permission);
```

Ocultar en el frontend es solo comodidad: la API rechaza con `403` lo que el usuario no puede hacer.

## 5. Otros endpoints disponibles

| Acción | Endpoint |
|---|---|
| Cerrar sesión | `POST /api/auth/logout` (luego borrar el token) |
| Cambiar mi contraseña | `POST /api/auth/change-password` `{ current_password, new_password }` |
| Gestionar administradores | `/api/admin-users` (ver [API_CONVENCIONES.md](API_CONVENCIONES.md#endpoints-de-autenticación)) |
| Ver auditoría | `GET /api/audit-log?limit=100` |

Reglas de contraseña: mínimo 10 caracteres, con letras y números.

## 6. Usuario para desarrollo

No hay usuario por defecto. Cada integrante crea el suyo en su base local:

```bash
# en backend/.env: ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD
npm run db:migrate
npm run db:seed-admin
```
