# Repositorio de Arte Universitario — Panel administrativo

Este panel vive separado del sitio público en la carpeta `admin/`, siguiendo una
arquitectura de aplicaciones independientes. El sitio público está en `frontend/`
y la API en `backend/`.

Módulo correspondiente al **Desarrollador 4**: panel de administración para gestionar obras, archivos,
categorías, subcategorías, estudiantes y graduados del repositorio de arte.

El proyecto funciona de inmediato con una **API simulada** (datos de demostración guardados en `localStorage`)
y queda preparado para conectarse al backend real de los desarrolladores 1, 2 y 3 cambiando una variable
de entorno.

---

## 1. Cómo ejecutarlo

Requisitos: Node.js 18 o superior.

```bash
npm install
npm run dev
```

Abre `http://localhost:5173`.

### Cuentas de demostración

| Rol | Correo | Contraseña | Alcance |
| --- | --- | --- | --- |
| Administrador | `admin@repositorio.edu.co` | `admin123` | Todo el panel |
| Editor | `editor@repositorio.edu.co` | `editor123` | Obras y archivos (clasificación y artistas en solo lectura) |

Los botones de la pantalla de acceso rellenan las credenciales automáticamente.

### Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con recarga en caliente |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Sirve la compilación localmente |
| `npm run typecheck` | Verificación de tipos de TypeScript |

---

## 2. Funcionalidades entregadas

### Dashboard administrativo
- Indicadores de obras (totales, publicadas, borradores, archivadas, vendidas), artistas, categorías y subcategorías.
- Distribución de obras por categoría y estado de publicación (gráfico de dona).
- Obras recientes con acceso directo a edición.
- Acciones rápidas según los permisos del rol.
- Resumen de la comunidad (estudiantes, graduados e inactivos).

### Gestión de obras
- Listado paginado desde el servidor con búsqueda por título, técnica, descripción o artista.
- Filtros por estado de publicación, categoría, subcategoría y artista.
- Cambio rápido de estado: **borrador / publicada / archivada**.
- Ficha completa: título, descripción, año, técnica, dimensiones, categoría, subcategoría y artista.
- Carga de **imágenes** (JPG/PNG/WebP, 8 MB, hasta 8), **videos** (MP4/WebM/MOV, 120 MB, hasta 3) y
  **documentos** (PDF, 20 MB, hasta 5), con validación de formato y tamaño en cliente y servidor.
- Selección de imagen de portada, vista previa de la galería y reemplazo/eliminación de archivos.
- Estado comercial (vendida / no vendida) editable únicamente por administradores.
- Obra destacada y confirmación al descartar cambios sin guardar.
- Confirmación antes de eliminar; validaciones en línea y mensajes de error del servidor.

### Categorías y subcategorías
- CRUD completo con nombre, slug, descripción y color de identificación.
- Conteo de subcategorías y obras asociadas.
- Activación/desactivación sin eliminar registros relacionados.
- Eliminación restringida si existen obras o subcategorías (mensaje explicativo).
- Filtro por estado y búsqueda; acceso directo desde cada categoría a sus subcategorías.
- Subcategorías ligadas a una categoría principal, con filtro por categoría y estado.

### Estudiantes y graduados
- Registro y edición de perfiles (nombres, apellidos, correo, teléfono, documento, programa, año de ingreso,
  año de graduación, biografía y estado).
- Listado paginado con búsqueda y filtros por tipo y estado.
- Acción **“Marcar como graduado”** que conserva obras e historial y registra el año de graduación.
- Activación/desactivación de perfiles sin perder sus obras.
- Acceso directo a las obras de cada artista.
- Eliminación restringida si tiene obras asociadas.

### Transversal
- Inicio de sesión con JWT, sesión persistente y cierre de sesión.
- Protección de rutas: sin sesión se redirige a `/login`.
- Roles y permisos en la interfaz (administrador / editor).
- Tokens expirados o respuestas `401` cierran la sesión automáticamente.
- Confirmaciones, toasts, estados de carga, estados vacíos y errores recuperables.
- Diseño responsive para escritorio, tableta y celular (menú lateral deslizable, filtros apilados y
  columnas secundarias ocultas en pantallas pequeñas).
- Accesibilidad básica: etiquetas asociadas, `aria-*`, foco visible, cierre de modales con `Escape` y
  respeto a `prefers-reduced-motion`.

---

## 3. Estructura del proyecto

```
src/
├── api/
│   ├── client.ts            # Cliente HTTP, JWT, selección mock/real
│   ├── errors.ts            # ApiError y mensajes
│   ├── services.ts          # Endpoints tipados consumidos por el panel
│   ├── session.ts           # Persistencia de la sesión
│   └── mock/
│       ├── db.ts            # Semilla y persistencia de la demo
│       └── handlers.ts      # API simulada completa
├── auth/                    # Contexto de sesión, ruta protegida y permisos
├── components/
│   ├── forms/MediaUploader.tsx
│   ├── layout/AdminLayout.tsx
│   ├── ui/                  # Botones, campos, tablas, modales, toasts…
│   └── icons.tsx
├── hooks/
├── pages/
│   ├── artworks/            # Listado y formulario de obra
│   ├── artists/             # Estudiantes y graduados
│   ├── categories/          # Categorías y subcategorías
│   ├── DashboardPage.tsx
│   └── LoginPage.tsx
├── styles/index.css
├── types/index.ts           # Contratos de datos compartidos
└── utils/
docs/API.md                  # Contrato de API esperado por el panel
```

---

## 4. Conexión con el backend real

Copia `.env.example` a `.env` y ajusta:

```env
VITE_API_URL=http://localhost:4000/api
VITE_USE_MOCK=false
VITE_PUBLIC_URL=http://localhost:5174
```

Con `VITE_USE_MOCK=false`:

- El panel llama a `VITE_API_URL` y adjunta `Authorization: Bearer <token>`.
- Espera respuestas JSON. Si vienen envueltas en `{ "data": ... }`, las desenvuelve automáticamente.
- Los errores deben responder `{ "message": "...", "errors": { "campo": "mensaje" } }`
  (el segundo objeto es opcional y se usa para pintar errores por campo).
- La subida de archivos usa `multipart/form-data` con los campos `kind` (`image`, `video` o `document`)
  y `files` (uno o varios archivos).

El contrato completo está en [`docs/API.md`](docs/API.md). Incluye endpoints, parámetros, cuerpos,
respuestas y códigos de error que el backend debe implementar para que el panel funcione sin cambios.

> **Importante:** la API real debe habilitar CORS para el origen del panel (`http://localhost:5173` en
> desarrollo) y permitir el encabezado `Authorization`.

### Modo demostración

- Los datos viven en `localStorage` bajo la clave `repositorio-arte-admin-db-v1`.
- Se siembran 20 obras, 8 categorías, 23 subcategorías y 11 artistas.
- Las imágenes de demostración son SVG generadas; las imágenes que subas se comprimen en el navegador
  antes de guardarse.
- Para reiniciar la demo: abre la consola del navegador y ejecuta
  `localStorage.removeItem('repositorio-arte-admin-db-v1')`, luego recarga.
- Si el almacenamiento se llena, el panel muestra un mensaje y sugiere conectar el backend real.

---

## 5. Roles y permisos

| Acción | Administrador | Editor |
| --- | :---: | :---: |
| Ver dashboard y listados | ✅ | ✅ |
| Crear / editar / eliminar obras y archivos | ✅ | ✅ |
| Cambiar estado de publicación | ✅ | ✅ |
| Crear / editar / eliminar categorías y subcategorías | ✅ | ❌ |
| Crear / editar / desactivar artistas | ✅ | ❌ |
| Marcar artistas como graduados | ✅ | ❌ |
| Cambiar estado comercial (vendida) | ✅ | ❌ |

La interfaz oculta las acciones no permitidas; **el backend debe validar los permisos nuevamente**.

---

## 6. Decisiones técnicas

- **React 19 + Vite 6 + TypeScript** sin librerías de UI externas: el sistema de diseño es propio y
  liviano, con estilos CSS centralizados.
- **Capa de servicios tipada** (`src/api/services.ts`) que separa las páginas del transporte HTTP.
- **API simulada** con la misma forma que el backend previsto: permite desarrollar y demostrar el panel
  mientras se construyen los módulos de los desarrolladores 1–3.
- **Paginación y filtros del servidor** para obras y artistas; categorías y subcategorías se cargan
  completas porque su volumen es acotado y se usan en selectores.
- **Formularios con validación doble** (cliente y servidor) y errores por campo.
- **Imágenes comprimidas en el cliente** solo en modo demo para no exceder el límite de `localStorage`.
  Con backend real se envían los archivos originales por `multipart/form-data`.

---

## 7. Despliegue

```bash
npm run build
```

Publica el contenido de `dist/`. Como la aplicación usa rutas del navegador (`BrowserRouter`), el servidor
debe redirigir cualquier ruta desconocida a `index.html` (fallback SPA).

Ejemplos:

- **Nginx:** `try_files $uri $uri/ /index.html;`
- **Vercel / Netlify:** configuración automática para Vite (o `/* → /index.html`).
- **Apache:** regla de reescritura a `index.html`.

Variables de entorno de producción:

```env
VITE_API_URL=https://api.tu-dominio.edu.co/api
VITE_USE_MOCK=false
VITE_PUBLIC_URL=https://repositorio.tu-dominio.edu.co
```

---

## 8. Pendientes fuera del alcance del Desarrollador 4

- Endpoints reales de autenticación, obras, archivos, categorías y artistas (desarrolladores 1–3).
- Vista pública del repositorio (desarrollador 5).
- Premios, exposiciones, mensajes de contacto y estado comercial desde el backend (desarrollador 6).
- Pruebas automatizadas end-to-end y unitarias (se recomienda añadirlas al integrar el backend).
