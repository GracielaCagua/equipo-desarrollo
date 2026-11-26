# Informe de Actualización del Sistema — Versión 1.1.0

Fecha: 26 de noviembre de 2026  
Versión del sistema: **v1.1.0**  
Estado de verificación: **Pruebas automáticas superadas con éxito (100%)**

---

## 1. Objetivos del Requerimiento

1. **Subida de obras exclusiva para administradores:** Restringir el permiso de creación, subida y modificación de obras artísticas de modo que solo los usuarios administradores puedan realizarlo.
2. **Desactivación global del registro de usuarios:** Deshabilitar la creación de nuevas cuentas en todo el sistema. Solo el usuario administrador puede iniciar sesión.
3. **Formatos permitidos de imagen (Pinturas, Dibujos, Arte 2D):** Aceptar única y exclusivamente archivos de imagen en formato `.png` o `.jpg` / `.jpeg` / `.jpn`.
4. **Descripción de la obra:** Incorporar y asegurar la captura del campo descriptivo para cada obra de arte.
5. **Preservación intacta del módulo de esculturas:** No alterar ni modificar el comportamiento, procesamiento ni almacenamiento de modelos 3D o esculturas (formatos GLB y glTF).

---

## 2. Detalle de Cambios Realizados por Componente

### A. Backend (`server.js`, rutas y servicios)
- **`backend/src/server.js`:**
  - **Desactivación de registro:** El endpoint `POST /api/auth/register` ahora responde de forma directa con error `403 Forbidden` (`El registro de usuarios está deshabilitado. Solo el administrador puede ingresar.`).
  - **Ingreso exclusivo de administradores:** En `POST /api/auth/login`, se verifica explícitamente que el usuario cuente con rol `admin`; de lo contrario, se rechaza la autenticación.
  - **Permisos de subida y edición de obras:** En los endpoints `POST /api/works`, `PUT /api/works/:id`, `PATCH /api/works/:id` y `DELETE /api/works/:id`, se aplica la comprobación `adminOnly(user)`. Cualquier intento no autenticado o de usuario estándar es denegado con código `403 Forbidden`.
  - **Validación estricta de imágenes en `slugImageData`:** Se restringió el regex y la validación de firma binaria únicamente a `png`, `jpeg`, `jpg` y `jpn`. Se rechazan formatos como WebP, GIF, BMP, etc.
  - **Soporte de extensiones y estáticos:** Se agregó la extensión `.jpn` a la tabla `MIMES` y al handler de archivos estáticos en `/uploads/`.
  - **Módulo de esculturas intacto:** La función `slugModelData` para GLB/glTF de 30 MB se mantuvo exactamente igual sin modificaciones.
- **`backend/src/routes/auth.js`:**
  - Se deshabilitó la ruta `POST /register` con `403 Forbidden`.
- **`backend/src/services/auth.js`:**
  - En la función `login`, se validó que cuentas sin rol administrativo no puedan iniciar sesión en el backend Express.
- **`backend/src/services/adminUsers.js`:**
  - Se desactivó la creación de nuevos usuarios administrativos con `403 Forbidden`.
- **`backend/src/routes/artworks.js`:**
  - Se añadió comprobación de rol administrativo en las rutas de creación de obra y subida de archivos multimedia.
- **`backend/src/validators/files.js`:**
  - Se actualizaron las extensiones de `FILE_TYPES.image` a `['.jpg', '.jpeg', '.png', '.jpn']`.
  - En `hasValidSignature`, se añadió la validación binaria para `.jpn`. Los validadores de esculturas (`model3d`), video y documentos se mantuvieron intactos.

---

### B. Frontend Principal (`frontend/app.js`)
- **Cabecera (`siteHeader`):** Se eliminó el enlace de "Crear cuenta". Se reemplazó por el acceso directo a "Acceso administrador".
- **Página de inicio (`home`):** Se removió el botón "Crear una cuenta" de la llamada a la acción (hero CTA).
- **Enrutamiento (`go` y `render`):** Toda navegación hacia `#/registro` es redirigida inmediatamente a `login`.
- **Vista de inicio de sesión (`authView`):**
  - Se eliminó completamente la opción y formulario de registro.
  - La pantalla ahora solo ofrece el formulario de ingreso administrativo con mensaje informativo de que el registro está deshabilitado en todo el sistema.
- **Panel de usuario (`userPanel`):**
  - Se eliminó la pestaña "Mis obras" y el botón "+ Subir obra" para evitar que perfiles de usuario estándar intenten subir creaciones.
- **Formulario y modal de obras (`entityModal`):**
  - Se etiquetó claramente el campo de descripción como "Descripción de la obra" (con soporte de hasta 4000 caracteres).
  - El selector de archivos de imagen restringe su atributo `accept` a `.png, .jpg, .jpeg, .jpn, image/png, image/jpeg`.
  - El apartado de Obra 3D (esculturas GLB/glTF) se mantuvo intacto.
- **Manejador de envío (`handleSubmit`):**
  - Se valida del lado del cliente que la imagen seleccionada tenga extensión `png`, `jpg`, `jpeg` o `jpn`. De lo contrario, muestra una alerta y bloquea el envío.
  - Se bloquea la creación o edición de obras si el usuario no tiene rol `admin`.
- **Manejador de clics (`handleClick`):**
  - Se previene la apertura de modales de creación de obra si el usuario no es administrador.
- **Visualizador (`media`):**
  - Se actualizó el regex de URLs de imágenes permitidas para admitir `.png`, `.jpg`, `.jpeg` y `.jpn`.

---

### C. Panel de Administración (`admin/`)
- **`admin/src/pages/LoginPage.tsx`:**
  - Se eliminó el modo registro (`mode === 'register'`) y las pestañas de selección de modo (`auth-mode-tabs`).
  - Se adaptó el formulario para autenticar únicamente al administrador.
  - Se removió el botón de usuario demo "Editor", conservando exclusivamente el botón de acceso de demostración de "Administrador".
- **`admin/src/utils/files.ts`:**
  - Se actualizó `FILE_RULES.image` con formatos permitidos: `['image/jpeg', 'image/png', 'image/jpg', 'image/jpn', '.png', '.jpg', '.jpeg', '.jpn']`.
  - Se configuró la etiqueta y pistas de usuario a `PNG o JPG/JPN`.
  - En `validateFiles`, se añadió verificación estricta de extensiones para imágenes, rechazando cualquier otro formato.
  - Los tipos `video`, `document` y modelos 3D quedaron intactos.

---

### D. Pruebas Automatizadas (`tests/integracion.test.js`)
Se actualizó la suite de integración para verificar exhaustivamente:
1. `POST /api/auth/register` retorna `403 Forbidden`.
2. Intento de inicio de sesión con usuario no existente o no administrador es rechazado.
3. Subida de obras sin credenciales de administrador retorna `403 Forbidden`.
4. Subida de imágenes con formato WebP o no permitido es rechazada con `400 Bad Request`.
5. Administrador puede subir obras con descripción y formato `.png` exitosamente.
6. Administrador puede subir obras con formato `.jpn` exitosamente.
7. Conservación del soporte de esculturas 3D en formato `.glb`.
8. Visualización en catálogo y persistencia en base de datos JSON local.

---

## 3. Resultados de Pruebas

### Suite de Integración Principal
```bash
npm test
```
**Resultado:**
- `✔ Flujo completo: cuentas, permisos, catálogo, venta, exposición y buzón` (Pasa en ~590ms)
- `1 passed, 0 failed`

### Validadores Unitarios de Backend
```bash
node --test backend/test/artworks.test.js backend/test/validators.test.js backend/test/special_modules.test.js
```
**Resultado:**
- `21 passed, 0 failed`

---

## 4. Control de Versiones

- `package.json`: Versión actualizada a **1.1.0**.
- `README.md`: Documentación actualizada con la versión 1.1.0, detallando las reglas de acceso y formatos válidos.
