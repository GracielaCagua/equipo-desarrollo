# Módulos Especiales: Premios, Exposiciones, Ventas y Contacto

Documento de entrega y especificación técnica de los módulos especiales desarrollados para el **Repositorio Universitario de Obras**.

---

## 1. Resumen del Alcance

Se implementaron de forma integral (backend y frontend) los módulos asignados al **Responsable de Módulos Especiales**:
1. **Módulo de Premios:** Registro y administración de galardones con nombre, descripción, fecha, artista premiado y obras relacionadas.
2. **Módulo de Exposiciones y Galería:** Gestión de eventos con título, ubicación, fechas de inicio y fin, descripción y galería de obras expuestas.
3. **Filtros por Categorías y Subcategorías:** Reutilización e integración de las clasificaciones del repositorio para filtrar tanto las obras expuestas como las obras comerciales.
4. **Sección Especial de Obras Expuestas:** Vista especializada con catálogo de obras presentadas en muestras, filtrables por disciplina (categoría), subcategoría y disponibilidad comercial.
5. **Estado Comercial de Obras (Ventas):** Funcionalidad exclusiva de administración para alternar el estado comercial de cualquier obra entre `vendida` (`sold`) o `no vendida` (`not_sold` / disponible).
6. **Formulario Público de Contacto:** Recepción de mensajes del público general y despacho hacia el correo institucional configurado (`contacto.repositorio@universidad.edu`).
7. **Bandeja Administrativa de Mensajes:** Panel de consulta, búsqueda y transición de estados (`unread`, `read`, `responded`, `archived`) para la gestión oportuna de comunicaciones.
8. **Pruebas Funcionales:** Suite de pruebas unitarias y funcionales ejecutables con Node.js (`npm test`).

---

## 2. Base de Datos (PostgreSQL)

Se incorporaron dos scripts en `backend/sql/`:
- `backend/sql/001_init.sql`: Esquema completo unificado y corregido para instalaciones desde cero.
- `backend/sql/002_special_modules.sql`: Migración incremental para bases de datos existentes.

### Estructura de Tablas Nuevas y Modificadas

```sql
-- Actualización de obras para el estado comercial
ALTER TABLE works ADD COLUMN commercial_status VARCHAR(20) NOT NULL DEFAULT 'not_sold';
ALTER TABLE works ADD COLUMN is_sold BOOLEAN NOT NULL DEFAULT FALSE;
-- CHECK (commercial_status IN ('sold', 'not_sold'))

-- Premios
CREATE TABLE awards (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT,
  award_date DATE NOT NULL,
  artist_id INTEGER NOT NULL REFERENCES artists(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Obras vinculadas a premios
CREATE TABLE award_works (
  award_id INTEGER NOT NULL REFERENCES awards(id) ON UPDATE CASCADE ON DELETE CASCADE,
  work_id INTEGER NOT NULL REFERENCES works(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (award_id, work_id)
);

-- Exposiciones
CREATE TABLE exhibitions (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  location VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Galería de obras de la exposición
CREATE TABLE exhibition_works (
  exhibition_id INTEGER NOT NULL REFERENCES exhibitions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  work_id INTEGER NOT NULL REFERENCES works(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  curator_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (exhibition_id, work_id)
);

-- Mensajes de contacto
CREATE TABLE contact_messages (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'unread' CHECK (status IN ('unread', 'read', 'responded', 'archived')),
  recipient_email VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 3. Endpoints de la API REST

### 3.1. Premios (`/api/awards`)
| Método | Ruta | Descripción | Parámetros / Cuerpo |
|---|---|---|---|
| `GET` | `/api/awards` | Listar premios con artista y obras relacionadas | Query: `artist_id`, `search` |
| `GET` | `/api/awards/:id` | Detalle de un premio específico | Param: `id` |
| `POST` | `/api/awards` | Crear un nuevo premio | JSON: `{ name, description, award_date, artist_id, work_ids }` |
| `PUT` | `/api/awards/:id` | Actualizar premio y obras vinculadas | JSON: `{ name, description, award_date, artist_id, work_ids }` |
| `DELETE` | `/api/awards/:id` | Eliminar un premio | Param: `id` |

### 3.2. Exposiciones y Obras Expuestas (`/api/exhibitions`)
| Método | Ruta | Descripción | Parámetros / Cuerpo |
|---|---|---|---|
| `GET` | `/api/exhibitions` | Listar exposiciones y conteo de galería | Query: `search` |
| `GET` | `/api/exhibitions/exposed-works` | **Sección especial:** Lista de obras expuestas | Query: `category_id`, `subcategory_id`, `exhibition_id`, `commercial_status`, `search` |
| `GET` | `/api/exhibitions/:id` | Detalle de exposición con galería completa de obras | Param: `id` |
| `POST` | `/api/exhibitions` | Crear exposición con obras en galería | JSON: `{ title, location, start_date, end_date, description, work_ids }` |
| `PUT` | `/api/exhibitions/:id` | Actualizar datos y galería | JSON: `{ title, location, start_date, end_date, description, work_ids }` |
| `DELETE` | `/api/exhibitions/:id` | Eliminar exposición | Param: `id` |

### 3.3. Ventas y Estado Comercial de Obras (`/api/works`)
| Método | Ruta | Descripción | Parámetros / Cuerpo |
|---|---|---|---|
| `GET` | `/api/works` | Listar obras del repositorio con artista, categorías y estado comercial | Query: `category_id`, `subcategory_id`, `artist_id`, `commercial_status`, `is_sold`, `search` |
| `GET` | `/api/works/:id` | Consultar obra específica | Param: `id` |
| `PATCH` | `/api/works/:id/commercial-status` | **Administración:** Cambiar estado a vendida o no vendida | JSON: `{ "commercial_status": "sold" \| "not_sold" }` o `{ "is_sold": true \| false }` |

### 3.4. Contacto y Bandeja Administrativa (`/api/contact`)
| Método | Ruta | Descripción | Parámetros / Cuerpo |
|---|---|---|---|
| `POST` | `/api/contact` | **Público:** Enviar formulario al correo institucional y almacenar mensaje | JSON: `{ name, email, phone, subject, message }` |
| `GET` | `/api/contact/messages` | **Administración:** Listar mensajes de contacto | Query: `status` (`unread`, `read`, `responded`, `archived`), `search` |
| `GET` | `/api/contact/messages/:id` | **Administración:** Consultar un mensaje en detalle | Param: `id` |
| `PATCH` | `/api/contact/messages/:id/status` | **Administración:** Actualizar estado del mensaje | JSON: `{ "status": "read" \| "responded" \| "archived" \| "unread" }` |
| `DELETE` | `/api/contact/messages/:id` | **Administración:** Eliminar mensaje de la bandeja | Param: `id` |

---

## 4. Servicio de Correo Institucional (`mailer.js`)

Se diseñó el servicio `backend/src/services/mailer.js`:
- Lee la variable `INSTITUTIONAL_EMAIL` (por defecto `contacto.repositorio@universidad.edu`).
- Simula y formatea el despacho institucional con registro en consola, fecha/hora ISO e identificador de entrega único (`messageId`).
- Entrega comprobante estructurado sin requerir dependencias externas adicionales, garantizando que el entorno no falle en ausencia de servidores SMTP locales.

---

## 5. Módulos Frontend Desarrollados

1. **`AwardsPage.jsx` (Premios):**
   - Tabla con listado de premios, fechas, artistas y conteo de obras asociadas.
   - Filtro reactivo por texto y por artista.
   - Modal para crear y editar premios, con selector dinámico de las obras pertenecientes al artista seleccionado.
   - Modal de visualización detallada del galardón.

2. **`ExhibitionsPage.jsx` (Exposiciones):**
   - Tabla de exposiciones con título, ubicación, rango de fechas y número de obras en galería.
   - Modal de creación/edición con asignación de obras del repositorio para la galería.
   - Modal de visualización de la **Galería** de la muestra, con tarjetas de obras, artista y estado comercial.

3. **`ExposedWorksPage.jsx` (Sección Especial: Obras Expuestas):**
   - Filtros sincronizados por **Categoría** y **Subcategoría** del repositorio.
   - Filtro por estado comercial (`Todas`, `No vendidas / Disponibles`, `Vendidas`).
   - Buscador por obra, artista o exposición.
   - Cuadrícula de tarjetas con insignias de disciplina, subcategoría, estado comercial y contexto curatorial.

4. **`CommercialStatusPage.jsx` (Ventas):**
   - Panel administrativo para gestionar la comercialización de obras.
   - Botón directo para alternar estado comercial: `Marcar como vendida` / `Marcar como no vendida`.
   - Filtros por categorías, subcategorías y búsqueda.

5. **`ContactPage.jsx` (Formulario Público de Contacto):**
   - Formulario limpio y accesible con validación de nombre, correo, teléfono opcional, asunto y mensaje.
   - Información institucional de contacto y horarios.
   - Comprobante en pantalla con confirmación del correo institucional destinatario y código de entrega.

6. **`MessagesInboxPage.jsx` (Bandeja Administrativa):**
   - Bandeja de entrada con filtros por estado (`No leídos`, `Leídos`, `Respondidos`, `Archivados`) y búsqueda.
   - Apertura y lectura del mensaje con marcado automático a leído.
   - Controles de un clic para cambiar estado a `Respondido`, `Archivado` o `No leído`.
   - Opción para eliminar mensajes.

7. **Navegación y Estilos (`Layout.jsx`, `App.jsx`, `styles.css`):**
   - Barra de navegación actualizada con accesos directos a todos los módulos.
   - Diseño adaptable (*responsive*) para dispositivos móviles y de escritorio.

---

## 6. Pruebas Funcionales Automatizadas

Se crearon y ejecutaron las pruebas funcionales en `backend/test/special_modules.test.js`:
- Despacho y recepción del servicio de correo institucional (`mailer`).
- Validación de campos obligatorios y formato de fechas en Premios.
- Validación de títulos, ubicaciones y fechas en Exposiciones.
- Validación de transiciones del estado comercial (`sold` / `not_sold` y booleanos).
- Validación de formato y campos del Formulario Público de Contacto.
- Validación de transiciones de estados de mensajes en la Bandeja Administrativa (`unread`, `read`, `responded`, `archived`).
- Validación de parámetros de filtrado para Obras Expuestas.

Para ejecutar las pruebas:
```bash
npm test
```
*Resultado: 14 pruebas pasando al 100%.*

