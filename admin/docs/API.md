# Contrato de API — Panel administrativo

Documento de integración para los desarrolladores 1, 2 y 3. El panel ya consume estos endpoints
(la implementación simulada sigue exactamente esta forma). Cualquier cambio debe coordinarse con el
Desarrollador 4.

- **Base URL de desarrollo:** `http://localhost:4000/api`
- **Autenticación:** `Authorization: Bearer <token>` en todas las rutas excepto `POST /auth/login`.
- **Formato:** JSON UTF-8. Subida de archivos: `multipart/form-data`.
- **Fechas:** ISO 8601 (`2026-11-05T14:30:00.000Z`).
- **IDs:** cadenas. En la demo son del tipo `work-01`, `cat-pintura`; en el backend pueden ser UUID.

## Envoltorio de respuestas

El panel acepta respuestas directas o envueltas en `data`:

```json
{ "data": { "id": "work-01", "title": "Raíces de barro" } }
```

Para listados paginados se espera:

```json
{
  "data": [],
  "meta": { "page": 1, "limit": 10, "total": 20, "totalPages": 2 }
}
```

Si se usa otro nombre para la paginación, ajustar `src/api/services.ts`.

## Errores

```json
{
  "message": "Revisa los campos obligatorios de la obra.",
  "errors": {
    "title": "El título es obligatorio.",
    "year": "Ingresa un año válido."
  }
}
```

| Código | Uso |
| --- | --- |
| `400` | Cuerpo mal formado |
| `401` | Token ausente, inválido o expirado (el panel cierra la sesión) |
| `403` | Rol sin permiso |
| `404` | Recurso inexistente |
| `409` | Conflicto: registro con relaciones, artista ya graduado, etc. |
| `422` | Validación de campos (`errors` por campo) |
| `500` | Error interno |

---

# Autenticación

## `POST /auth/login`

```json
{ "email": "admin@repositorio.edu.co", "password": "admin123" }
```

**200**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user-admin",
    "name": "Ana María Ruiz",
    "email": "admin@repositorio.edu.co",
    "role": "admin"
  }
}
```

`role`: `admin` | `editor`.

**401** → `{ "message": "Correo o contraseña incorrectos." }`

## `GET /auth/me`

Devuelve el usuario de la sesión. Se usa para revalidar el token al extender la integración.

---

# Dashboard

## `GET /dashboard/stats`

```json
{
  "artworks": { "total": 20, "published": 14, "draft": 4, "archived": 2, "sold": 3 },
  "artists": { "total": 11, "students": 5, "graduates": 6, "inactive": 1 },
  "categories": { "total": 8, "active": 7, "subcategories": 23 },
  "byCategory": [
    { "id": "cat-pintura", "name": "Pintura", "color": "#b4533a", "count": 4 }
  ],
  "recent": []
}
```

`recent`: últimas 5 obras con las relaciones incluidas (ver estructura de obra).

---

# Obras

## Estructura de obra

```json
{
  "id": "work-01",
  "title": "Raíces de barro",
  "slug": "raices-de-barro",
  "description": "Una serie de piezas…",
  "year": 2024,
  "technique": "Gres esmaltado y raku",
  "dimensions": "32 × 28 × 24 cm",
  "categoryId": "cat-ceramica",
  "subcategoryId": "sub-raku",
  "artistId": "art-01",
  "status": "published",
  "sold": false,
  "featured": true,
  "coverUrl": "https://cdn…/portada.jpg",
  "media": [
    {
      "id": "media-01",
      "name": "raices.jpg",
      "type": "image/jpeg",
      "size": 245760,
      "kind": "image",
      "url": "https://cdn…/raices.jpg"
    }
  ],
  "createdAt": "2026-10-01T10:00:00.000Z",
  "updatedAt": "2026-11-01T10:00:00.000Z",
  "artist": { "id": "art-01", "firstName": "Valentina", "lastName": "Restrepo Gómez", "type": "student", "program": "Artes Plásticas" },
  "category": { "id": "cat-ceramica", "name": "Cerámica", "color": "#b56576" },
  "subcategory": { "id": "sub-raku", "name": "Raku" }
}
```

`status`: `draft` | `published` | `archived`.
`kind` de archivo: `image` | `video` | `document`.

Las relaciones `artist`, `category` y `subcategory` son **opcionales** pero recomendadas para evitar
consultas adicionales en el listado.

## `GET /artworks`

Parámetros de consulta (todos opcionales):

| Parámetro | Tipo | Descripción |
| --- | --- | --- |
| `search` | string | Título, descripción, técnica o nombre del artista |
| `status` | `draft` \| `published` \| `archived` | Estado de publicación |
| `categoryId` | string | Categoría |
| `subcategoryId` | string | Subcategoría |
| `artistId` | string | Artista |
| `sold` | boolean | Estado comercial |
| `page` | number | Página (por defecto 1) |
| `limit` | number | Tamaño de página (por defecto 10) |

**200** → `{ data: Artwork[], meta: { page, limit, total, totalPages } }`

## `GET /artworks/:id`

**200** → `Artwork` · **404** si no existe.

## `POST /artworks`

```json
{
  "title": "Nueva obra",
  "description": "Descripción de al menos 20 caracteres…",
  "year": 2026,
  "technique": "Óleo sobre lino",
  "dimensions": "120 × 80 cm",
  "categoryId": "cat-pintura",
  "subcategoryId": "sub-oleo",
  "artistId": "art-01",
  "status": "draft",
  "sold": false,
  "featured": false,
  "coverUrl": "data:image/jpeg;base64,…",
  "media": []
}
```

**201** → `Artwork` creado.
**422** → errores por campo (`title`, `description`, `year`, `technique`, `dimensions`, `categoryId`,
`subcategoryId`, `artistId`).

Reglas esperadas:

- `subcategoryId` debe pertenecer a `categoryId`.
- No se debe permitir asignar categorías/subcategorías inactivas a obras nuevas.
- `coverUrl` es opcional; si falta, el backend puede usar la primera imagen.

## `PUT /artworks/:id`

Mismo cuerpo que `POST`. **200** → `Artwork` actualizado.

## `DELETE /artworks/:id`

**200** → `{ "id": "work-01" }` o **204**.

## `PATCH /artworks/:id/status`

```json
{ "status": "published" }
```

**200** → `Artwork` actualizado.

## `POST /artworks/:id/files`

`multipart/form-data`:

| Campo | Descripción |
| --- | --- |
| `kind` | `image` \| `video` \| `document` |
| `files` | Uno o varios archivos (mismo nombre de campo) |

Límites que valida el panel y debe validar el backend:

| Tipo | Formatos | Peso máximo | Cantidad máxima |
| --- | --- | --- | --- |
| Imagen | `image/jpeg`, `image/png`, `image/webp` | 8 MB | 8 |
| Video | `video/mp4`, `video/webm`, `video/quicktime` | 120 MB | 3 |
| Documento | `application/pdf` | 20 MB | 5 |

**201** → `Artwork` actualizado (incluye los nuevos elementos de `media`) o
`{ "media": MediaFile[] }`. El panel no depende de la respuesta porque vuelve al listado, pero
se recomienda devolver la obra actualizada.

**422** si el formato o el tamaño no cumplen las reglas.
**409/413** si se excede el número de archivos o el tamaño permitido por el servidor.

---

# Categorías

## Estructura

```json
{
  "id": "cat-pintura",
  "name": "Pintura",
  "slug": "pintura",
  "description": "Obra pictórica sobre lienzo, madera o muro.",
  "color": "#b4533a",
  "active": true,
  "createdAt": "2025-09-12T10:00:00.000Z",
  "subcategoryCount": 4,
  "artworkCount": 4
}
```

`subcategoryCount` y `artworkCount` son calculados y usados solo para visualización.

## `GET /categories`

Parámetros: `search`, `active` (`true`/`false`). Devuelve `Category[]` (sin paginar).

## `POST /categories`

```json
{
  "name": "Arte digital",
  "slug": "arte-digital",
  "description": "Creación con medios computacionales.",
  "color": "#5f5aa8",
  "active": true
}
```

**201** → `Category`. **422** para nombre/slug inválidos o duplicados.

## `PUT /categories/:id`

Mismo cuerpo. **200** → `Category`.

## `PATCH /categories/:id/status`

```json
{ "active": false }
```

**200** → `Category`. No elimina subcategorías ni obras.

## `DELETE /categories/:id`

**200** → `{ "id": "..." }`.
**409** si tiene subcategorías u obras asociadas: el panel muestra el mensaje del backend y sugiere
desactivarla.

---

# Subcategorías

## Estructura

```json
{
  "id": "sub-oleo",
  "categoryId": "cat-pintura",
  "name": "Óleo",
  "slug": "oleo",
  "description": "Pintura al óleo sobre soportes tradicionales.",
  "active": true,
  "createdAt": "2025-09-12T10:00:00.000Z",
  "artworkCount": 2,
  "category": { "id": "cat-pintura", "name": "Pintura", "color": "#b4533a" }
}
```

## `GET /subcategories`

Parámetros: `search`, `categoryId`, `active`. Devuelve `Subcategory[]` (sin paginar).

## `POST /subcategories`

```json
{
  "categoryId": "cat-pintura",
  "name": "Acuarela",
  "slug": "acuarela",
  "description": "Transparencias y veladuras sobre papel.",
  "active": true
}
```

**201** → `Subcategory`. **422** si la categoría no existe o el slug está duplicado.

## `PUT /subcategories/:id`

Mismo cuerpo. **200** → `Subcategory`.

## `PATCH /subcategories/:id/status`

```json
{ "active": false }
```

## `DELETE /subcategories/:id`

**200** o **409** si tiene obras asociadas.

---

# Artistas (estudiantes y graduados)

## Estructura

```json
{
  "id": "art-01",
  "firstName": "Valentina",
  "lastName": "Restrepo Gómez",
  "email": "valentina.restrepo@universidad.edu.co",
  "phone": "310 456 7812",
  "document": "1025478963",
  "program": "Artes Plásticas",
  "type": "student",
  "status": "active",
  "startYear": 2021,
  "endYear": null,
  "bio": "Explora la memoria del oficio cerámico…",
  "createdAt": "2025-10-01T10:00:00.000Z",
  "artworkCount": 1
}
```

`type`: `student` | `graduate`. `status`: `active` | `inactive`.

## `GET /artists`

Parámetros: `search` (nombre, correo o documento), `type`, `status`, `page`, `limit`.
**200** → `{ data: Artist[], meta }` (paginado).

## `GET /artists/:id`

**200** → `Artist` con `artworkCount`.

## `POST /artists`

```json
{
  "firstName": "Valentina",
  "lastName": "Restrepo Gómez",
  "email": "valentina.restrepo@universidad.edu.co",
  "phone": "310 456 7812",
  "document": "1025478963",
  "program": "Artes Plásticas",
  "type": "student",
  "status": "active",
  "startYear": 2021,
  "bio": "Explora la memoria del oficio cerámico…"
}
```

**201** → `Artist`. **422** para correo/documento duplicado, correo inválido o años inconsistentes.

## `PUT /artists/:id`

Mismo cuerpo. Si `type = graduate`, `endYear` es obligatorio y debe ser mayor o igual a `startYear`.

## `PATCH /artists/:id/graduate`

```json
{ "endYear": 2026 }
```

`endYear` es opcional; si no llega, el backend usa el año actual. El artista pasa a `type = "graduate"`
y `status = "active"` **sin modificar sus obras ni su historial**.

**409** si ya es graduado.

## `PATCH /artists/:id/status`

```json
{ "status": "inactive" }
```

**200** → `Artist`. No elimina obras.

## `DELETE /artists/:id`

**200** o **409** si tiene obras asociadas. El panel sugiere desactivar en ese caso.

---

# Recomendaciones de implementación

1. **Validar permisos en el backend**: el panel oculta acciones según el rol, pero un editor no debe poder
   crear categorías/artistas ni cambiar el estado comercial de una obra.
2. **Estado comercial:** aceptar `sold` en `POST/PUT /artworks` solo cuando el rol sea `admin`. Para
   editores, conservar el valor existente.
3. **Slugs únicos** por colección (categorías y subcategorías). El panel genera el slug automáticamente
   pero permite editarlo.
4. **Borrado lógico** sugerido para categorías, subcategorías y artistas cuando tengan relaciones. El
   contrato usa `409` y el panel invita a desactivar.
5. **Subcategorías inactivas:** no permitir su asignación a obras nuevas; conservar las ya asignadas.
6. **CORS** para el origen del panel y exposición del encabezado `Authorization`.
7. **Archivos:** devolver URLs públicas o firmadas dentro de `media`. Guardar metadatos (`name`, `type`,
   `size`, `kind`) para mostrarlos en el panel.
8. **Paginación estable:** ordenar obras por `updatedAt` descendente para que el listado refleje las
   últimas modificaciones.
