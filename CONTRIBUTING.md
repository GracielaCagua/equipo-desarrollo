# Flujo de trabajo del equipo

## Ramas

- `main`: código estable e integrado. No se hace push directo.
- Una rama por módulo o tarea, creada desde la rama base actualizada:

| Prefijo | Uso | Ejemplo |
|---|---|---|
| `feature/` | Funcionalidad nueva | `feature/arquitectura-auth`, `feature/backend-obras` |
| `fix/` | Corrección | `fix/login-expirado` |
| `docs/` | Solo documentación | `docs/convenciones-api` |

```bash
git checkout main && git pull
git checkout -b feature/<modulo>
# ... trabajo ...
git push -u origin feature/<modulo>
```

Integración mediante **Pull Request** hacia `main`, con al menos una revisión de otro integrante y `npm test` en verde.

## Commits

Formato *Conventional Commits*, en español, breve e imperativo:

```text
feat(auth): agregar inicio de sesión de administradores
fix(db): mover restricción única a subcategories
docs: documentar convenciones de API
test(auth): cubrir permisos por rol
refactor | chore | style
```

Un commit = un cambio coherente. No mezclar refactor con funcionalidad.

## Reglas

- Nunca versionar `.env`, credenciales ni `node_modules` (ya están en `.gitignore`).
- No editar migraciones ya integradas: crear `backend/sql/00N_<modulo>.sql`.
- Seguir [docs/API_CONVENCIONES.md](docs/API_CONVENCIONES.md) para rutas, JSON y errores.
- Toda ruta administrativa nueva debe montarse con `protectWrites` o `protectAll` (ver [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md)).
- Antes de abrir el PR: `git pull origin main`, resolver conflictos y ejecutar `npm test` y `npm run build`.
