# Repositorio De Arte (v1.1.0)

Aplicación para la catalogación y difusión de obras de arte de estudiantes y graduados. Esta versión cuenta con endurecimiento de acceso administrativo exclusivo para la subida de obras y gestión del repositorio.

## Versión actual del programa: v1.1.0

### Novedades y reglas de seguridad aplicadas en la v1.1.0:
1. **Subida de obras restringida únicamente a administradores:** Los usuarios estándar no pueden crear, subir ni modificar obras. Solo las cuentas con rol de administrador tienen permisos de gestión de obras y catálogo.
2. **Registro de usuarios deshabilitado a nivel global:** Se desactivó la creación de nuevos usuarios en todo el sistema (tanto en backend como en frontend y panel de administración). Solo el administrador puede iniciar sesión en la plataforma.
3. **Restricción estricta de formatos de imagen para pinturas y obras 2D:** Únicamente se aceptan formatos `.png`, `.jpg`, `.jpeg` y `.jpn`. Cualquier otro formato de imagen (WebP, GIF, SVG, BMP, etc.) es rechazado tanto en cliente como en servidor mediante validación de firma y MIME.
4. **Campo de descripción enriquecido por obra:** Cada obra cuenta con campo para ingresar una descripción detallada de la pieza, su proceso o técnica.
5. **Preservación intacta del apartado de esculturas y 3D:** El soporte para modelos 3D y esculturas (formatos GLB y glTF de hasta 30 MB) se mantiene íntegro sin alteraciones.

## Cómo ejecutar (Windows, macOS o Linux)

1. Instala **Node.js 20 o superior** si aún no lo tienes: https://nodejs.org/
2. Abre la carpeta del proyecto en la terminal.
3. Ejecuta:

   ```bash
   npm start
   ```

4. Abre **http://localhost:3000** en el navegador.

> **No necesitas PostgreSQL ni ejecutar `npm install` para comenzar.** La aplicación utiliza funciones nativas incluidas en Node.js y guarda los datos de forma local en `backend/data/repositorio.json` (se genera automáticamente).

### Datos de acceso del sistema

- **Administrador:** usuario `admin`, contraseña `admin123`.
- **Registro de usuarios:** Deshabilitado por política de seguridad del sistema. El acceso está restringido exclusivamente a administradores autorizados.

⚠️ **IMPORTANTE:** La contraseña del administrador inicial es solo para demostración. Cámbiala en **Administración > Configuración > Seguridad de cuenta**.

## Qué incluye

| Funcionalidad | Administrador | Visitante / Público |
|---|---|---|
| Acceso al sistema | Inicio de sesión exclusivo | Exploración pública |
| Gestión de catálogo | Crear, editar y eliminar | Consulta y filtros |
| Subida de obras | Exclusivo para administradores (PNG, JPG/JPN, GLB/glTF) | Visualización de obras publicadas |
| Descripción de obras | Registro y edición de descripción detallada | Lectura de ficha técnica y descripción |
| Publicación de obras | Publicar u ocultar borradores | Solo obras publicadas |
| Premios | Asignar premios y nombre del galardón | Sección pública de premios |
| Exposiciones | Registrar obras expuestas y muestra | Sección pública de exposiciones |
| Estado de venta | Vendida / No vendida (solo administración) | Filtro por vendida / disponible |
| Buzón de contacto | Bandeja administrativa de mensajes | Formulario público de contacto |

## Estructura

```text
Repositorio-De-Arte/
├── backend/
│   ├── src/server.js         # API, roles, autenticación, datos y servidor web
│   ├── data/                 # Datos persistentes (se crea repositorio.json)
│   └── uploads/              # Imágenes subidas de obras
├── frontend/
│   ├── index.html            # Página HTML
│   ├── styles.css            # Estilos responsivos
│   ├── app.js                # Interfaz y comportamiento
│   └── favicon.svg           # Ícono de la aplicación
├── tests/integracion.test.js # Prueba del flujo completo
├── package.json
└── README.md
```

## Configurar buzón y correo

Todos los mensajes enviados por **Contacto** se guardan en el buzón del administrador, incluso si no configuras correo SMTP.

1. Entra al panel administrador, abre **Configuración** y registra el correo de contacto (por ejemplo, `arte@universidad.edu.ec`).
2. Si deseas **notificaciones reales por correo**, configura estas variables en el entorno del backend:

   ```env
   SMTP_HOST=smtp.tu-proveedor.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=usuario@tu-proveedor.com
   SMTP_PASS=tu-clave-de-aplicacion
   SMTP_FROM=usuario@tu-proveedor.com
   ```

3. Ejecuta `npm install` para instalar **Nodemailer** (dependencia opcional) y reinicia el servidor. Node.js no lee automáticamente los archivos `.env` en todas las versiones, por eso puedes iniciar con `node --env-file=backend/.env backend/src/server.js` en Node.js 20.6+ o establecer las variables por tu sistema operativo.

> No pongas contraseñas SMTP en archivos compartidos ni en GitHub. Si SMTP falla, los mensajes siguen almacenados en el buzón.

## Consejos para reemplazar un proyecto anterior

Esta entrega es **una implementación completa e independiente**, no una modificación línea por línea del repositorio original de GitHub, ya que no se pudo descargar su contenido desde este entorno. Respeta la separación en `frontend` y `backend`, pero usa Node.js sin PostgreSQL para facilitar la ejecución local.

1. **Haz una copia de seguridad** del proyecto anterior y de cualquier base de datos.
2. Crea una carpeta nueva y extrae este ZIP ahí. **No sobrescribas una instalación anterior con datos** si no has respaldado sus archivos.
3. Ejecuta `npm start` desde la carpeta raíz.
4. Comprueba el inicio de sesión del administrador y crea una cuenta nueva.
5. Si ya tenías información en PostgreSQL, necesitarás una migración específica: esta versión NO la importa automáticamente.

Para conservar los datos de **esta** versión al cambiar de computadora, respalda `backend/data/repositorio.json` y las imágenes de `backend/uploads/`.

## Pruebas

Desde la raíz:

```bash
npm test
```

Las pruebas comprueban registro, ingreso del admin, control de permisos, creación de categorías, subcategorías, artistas y obras, premio, exposición, venta, graduación y mensajes.

## Consideraciones técnicas

- Contraseñas almacenadas con PBKDF2-SHA256 y sal aleatoria; no se guardan contraseñas de usuarios en texto plano.
- Tokens de sesión aleatorios con expiración a siete días; las rutas de administración verifican el rol en el servidor.
- Control de acceso basado en roles: solo usuarios con rol de administrador pueden subir, actualizar y eliminar obras.
- Archivos de imagen admitidos exclusivamente en formato PNG o JPG/JPN (máximo 5 MB), validados por cabecera y firma mágica de archivo.
- Soporte completo y aislado para esculturas y modelos 3D en formatos estándar GLB y glTF (máximo 30 MB).
- Persistencia JSON local para uso académico. Para múltiples servidores y alta concurrencia se recomienda una base de datos SQL.
- Sin imágenes o datos inventados de obras: el repositorio comienza con categorías de ejemplo y las obras se agregan desde el panel administrador.
