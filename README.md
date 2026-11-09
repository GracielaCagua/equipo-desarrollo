# Repositorio Universitario de Obras (Versión 2.0.0)

Plataforma universitaria para la administración de clasificación artística, perfiles de artistas y **Módulos Especiales** (premios, exposiciones y galerías, catálogo de obras expuestas, ventas / estado comercial y canal de contacto público con bandeja administrativa). La API persiste las operaciones en PostgreSQL; no se usan datos ficticios.

## Tecnologías

- Node.js (18+), Express y PostgreSQL (14+).
- React 18 y Vite.
- JavaScript ES modules.
- Suite de pruebas nativa con `node:test`.

## Estructura

```text
backend/
  src/
    config/          # Variables de entorno y correo institucional
    db/              # Conexión y consultas PostgreSQL
    middleware/      # Manejo unificado de errores HTTP
    routes/          # Categorías, subcategorías, artistas, premios, exposiciones, obras y contacto
    services/        # Lógica de negocio, consultas y servicio de correo institucional (mailer)
    utils/           # Clases y utilidades de error HTTP
    validators/      # Validaciones de formatos, fechas, estados y tipos
  sql/
    001_init.sql     # Esquema completo consolidado
    002_special_modules.sql # Migración incremental para módulos especiales
  test/              # Pruebas unitarias y funcionales
frontend/
  src/
    components/      # Shell de la aplicación, barra de navegación, modales y mensajes
    pages/           # Categorías, subcategorías, artistas, premios, exposiciones, obras expuestas, ventas, contacto y bandeja
    services/        # Cliente API centralizado (fetch)
```

## Instalación y Configuración

Requisitos: Node.js 18+, npm y PostgreSQL 14+.

1. Cree una base de datos en PostgreSQL, por ejemplo `repositorio_obras`.
2. Para una instalación nueva, ejecute `backend/sql/001_init.sql`. Si ya tenía una base previa, ejecute `backend/sql/002_special_modules.sql`.
3. Copie `backend/.env.example` a `backend/.env` y ajuste `DATABASE_URL` e `INSTITUTIONAL_EMAIL` (por defecto `contacto.repositorio@universidad.edu`).
4. Instale dependencias: `npm run install:all`.
5. Inicie la API backend: `npm run dev:backend`.
6. En otra terminal, inicie el frontend: `npm run dev:frontend`.
7. Abra `http://localhost:5173`.

## API REST

### Clasificación y Artistas
| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/api/categories` | Listar, buscar y crear categorías |
| GET/PUT | `/api/categories/:id` | Consultar y editar una categoría |
| PATCH | `/api/categories/:id/status` | Activar/desactivar (`{"is_active": false}`) |
| GET/POST | `/api/subcategories` | Filtrar por `category_id` y crear |
| GET/PUT | `/api/subcategories/:id` | Consultar y editar subcategoría |
| PATCH | `/api/subcategories/:id/status` | Activar/desactivar subcategoría |
| GET/POST | `/api/artists` | Buscar/filtrar y registrar artistas |
| GET/PUT | `/api/artists/:id` | Perfil y edición de artista |
| PATCH | `/api/artists/:id/academic-status` | Cambiar a `student` o `graduate` |
| GET | `/api/artists/:id/works` | Obras asociadas a un artista |

### Módulos Especiales (Premios, Exposiciones, Ventas y Contacto)
| Método | Ruta | Uso |
|---|---|---|
| GET/POST | `/api/awards` | Listar y crear premios (con artista y obras relacionadas) |
| GET/PUT/DELETE | `/api/awards/:id` | Consultar, actualizar y eliminar premios |
| GET/POST | `/api/exhibitions` | Listar y crear exposiciones con obras en galería |
| GET/PUT/DELETE | `/api/exhibitions/:id` | Consultar con galería, actualizar y eliminar exposición |
| GET | `/api/exhibitions/exposed-works` | **Sección especial:** Obras expuestas con filtros de categoría y subcategoría |
| GET | `/api/works` | Listar obras con artista, categorías y estado comercial |
| PATCH | `/api/works/:id/commercial-status` | **Administración:** Cambiar estado comercial (`sold` / `not_sold`) |
| POST | `/api/contact` | **Público:** Enviar formulario de contacto al correo institucional |
| GET | `/api/contact/messages` | **Administración:** Consultar mensajes y filtrar por estado |
| GET/DELETE | `/api/contact/messages/:id` | **Administración:** Detalle y eliminación de mensaje |
| PATCH | `/api/contact/messages/:id/status` | **Administración:** Cambiar estado (`unread`, `read`, `responded`, `archived`) |

## Módulos de la Interfaz Web

- **Categorías y Subcategorías:** Clasificación disciplinar del repositorio.
- **Artistas:** Perfiles académicos de estudiantes y graduados.
- **Premios:** Reconocimientos vinculados a artistas y obras específicas.
- **Exposiciones:** Muestras artísticas con fechas, ubicación y galería de obras expuestas.
- **Obras Expuestas:** Catálogo filtrable por categorías, subcategorías y disponibilidad comercial.
- **Ventas (Administración):** Control exclusivo para alternar el estado comercial de obras (vendida o no vendida).
- **Contacto (Público):** Formulario para la comunidad universitaria y visitantes, enviado al correo institucional.
- **Bandeja de Mensajes (Administración):** Gestión de mensajes con cambio de estado interactivo.

Para más detalles técnicos, consulte el documento [`MODULOS_ESPECIALES.md`](./MODULOS_ESPECIALES.md).

## Pruebas

Ejecute la suite de pruebas unitarias y funcionales:
```bash
npm test
```
Verifica validaciones de datos, despacho de correos institucionales, filtros de obras expuestas, estados comerciales y ciclo de vida de mensajes de contacto.
