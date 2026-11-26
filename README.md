# Repositorio De Arte

Aplicación completa para gestionar obras de arte de estudiantes y graduados. Contiene dos perfiles independientes: **administrador** y **usuario**, con un diseño adaptable a celulares y computadoras.

## Cómo ejecutar (Windows, macOS o Linux)

1. Instala **Node.js 20 o superior** si aún no lo tienes: https://nodejs.org/
2. Descomprime el ZIP. Abre la carpeta **Repositorio-De-Arte** en Visual Studio Code.
3. Abre **Terminal > Nueva terminal** en la raíz del proyecto.
4. Ejecuta:

   ```bash
   npm start
   ```

5. Abre **http://localhost:3000** en el navegador.

> **No necesitas PostgreSQL ni ejecutar `npm install` para comenzar.** La aplicación utiliza funciones incluidas en Node.js y guarda los datos de forma local en `backend/data/repositorio.json` (el archivo se crea automáticamente).

### Datos de acceso iniciales

- **Administrador:** usuario `admin`, contraseña `admin123`.
- **Usuarios normales:** pulsa **Crear cuenta**. Después del registro entrarás automáticamente al panel de usuario. Los usuarios también pueden iniciar sesión con su correo electrónico.

⚠️ **IMPORTANTE:** La contraseña del administrador es solo para demostración. Antes de publicar la aplicación en Internet, cámbiala en **Administración > Configuración > Seguridad de cuenta**. Este sistema está preparado para ejecución local / proyecto académico, no para desplegarlo públicamente sin medidas adicionales como HTTPS, copias de seguridad, rate limiting y endurecimiento del servidor.

## Qué incluye

| Funcionalidad | Administrador | Usuario |
|---|---|---|
| Registro e inicio de sesión | Accede con credenciales iniciales | Crea cuenta e inicia sesión |
| Panel independiente | Sí | Sí |
| Categorías y subcategorías | Crear, editar, activar/desactivar, eliminar si no hay relaciones | Explorar y filtrar |
| Estudiantes y graduados | Crear perfiles, editar, cambiar situación académica | Consultar perfiles |
| Obras | Crear, editar, cargar imágenes y eliminar | Ver fichas, buscar y filtrar |
| Publicación | Publicar u ocultar obras | Solo obras publicadas |
| Premios | Marcar obra premiada y escribir nombre del premio | Ventana de premios |
| Exposiciones | Marcar obra expuesta y escribir nombre de exposición | Ventana de exposiciones |
| Estado de venta | Vendida / No vendida | Filtrar obras expuestas |
| Contacto | Leer, marcar y eliminar mensajes, configurar correo | Enviar consultas |

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
- Archivos de imagen PNG/JPEG/WEBP de máximo 5 MB.
- Persistencia JSON local para uso académico. Para múltiples servidores y alta concurrencia se recomienda una base de datos SQL.
- Sin imágenes o datos inventados de obras: el repositorio comienza con categorías de ejemplo y las obras se agregan desde el panel administrador.
