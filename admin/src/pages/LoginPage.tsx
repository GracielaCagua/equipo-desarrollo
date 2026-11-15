import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { Button } from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { IconAlert, IconEye, IconLock, IconMail, IconSparkle } from '../components/icons'
import { isEmail } from '../utils/validators'

interface LocationState {
  from?: { pathname?: string }
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const nextErrors: typeof errors = {}
    if (!email.trim()) nextErrors.email = 'El correo es obligatorio.'
    else if (!isEmail(email)) nextErrors.email = 'Ingresa un correo electrónico válido.'
    if (!password) nextErrors.password = 'La contraseña es obligatoria.'
    else if (password.length < 6) nextErrors.password = 'La contraseña debe tener al menos 6 caracteres.'
    setErrors(nextErrors)
    setFormError('')
    if (Object.keys(nextErrors).length) return

    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(state?.from?.pathname ?? '/', { replace: true })
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'No fue posible iniciar sesión. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const fillDemo = (role: 'admin' | 'editor') => {
    setEmail(role === 'admin' ? 'admin@repositorio.edu.co' : 'editor@repositorio.edu.co')
    setPassword(role === 'admin' ? 'admin123' : 'editor123')
    setErrors({})
    setFormError('')
  }

  return (
    <div className="login-page">
      <section className="login-brand">
        <div className="login-brand-top">
          <div className="brand-mark brand-mark-light">RA</div>
          <span>Repositorio de Arte Universitario</span>
        </div>

        <div className="login-brand-copy">
          <span className="login-eyebrow">Panel de administración</span>
          <h1>El archivo vivo del arte universitario.</h1>
          <p>
            Gestiona obras, clasificaciones y trayectorias de estudiantes y graduados en un solo lugar,
            con la trazabilidad que exige el repositorio.
          </p>

          <div className="login-collage" aria-hidden="true">
            <div className="collage-card collage-card-1">
              <span>Pintura</span>
            </div>
            <div className="collage-card collage-card-2">
              <span>Fotografía</span>
            </div>
            <div className="collage-card collage-card-3">
              <span>Escultura</span>
            </div>
          </div>

          <ul className="login-features">
            <li>
              <IconSparkle size={16} /> Curaduría visual de obras y archivos
            </li>
            <li>
              <IconSparkle size={16} /> Categorías y subcategorías siempre organizadas
            </li>
            <li>
              <IconSparkle size={16} /> Historial intacto al graduarse un estudiante
            </li>
          </ul>
        </div>

        <p className="login-brand-foot">© {new Date().getFullYear()} Repositorio de Arte Universitario · Módulo administrativo</p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card-head">
            <span className="eyebrow">Acceso restringido</span>
            <h2>Bienvenido de nuevo</h2>
            <p>Ingresa con tu cuenta administrativa para gestionar el repositorio.</p>
          </div>

          {formError && (
            <div className="alert alert-danger" role="alert">
              <IconAlert size={18} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <Field label="Correo institucional" htmlFor="email" required error={errors.email}>
              <div className="input-with-icon">
                <IconMail size={18} />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@repositorio.edu.co"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value)
                    if (errors.email) setErrors({ ...errors, email: undefined })
                  }}
                  invalid={Boolean(errors.email)}
                />
              </div>
            </Field>

            <Field label="Contraseña" htmlFor="password" required error={errors.password}>
              <div className="input-with-icon">
                <IconLock size={18} />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (errors.password) setErrors({ ...errors, password: undefined })
                  }}
                  invalid={Boolean(errors.password)}
                />
                <button
                  type="button"
                  className="input-action"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <IconEye size={18} />
                </button>
              </div>
            </Field>

            <Button type="submit" className="login-submit" loading={loading}>
              Iniciar sesión
            </Button>
          </form>

          <div className="demo-box">
            <div className="demo-box-head">
              <strong>Cuentas de demostración</strong>
              <span>El panel funciona sin backend en modo demo.</span>
            </div>
            <div className="demo-actions">
              <button type="button" onClick={() => fillDemo('admin')}>
                <strong>Administrador</strong>
                <span>admin@repositorio.edu.co · admin123</span>
              </button>
              <button type="button" onClick={() => fillDemo('editor')}>
                <strong>Editor</strong>
                <span>editor@repositorio.edu.co · editor123</span>
              </button>
            </div>
          </div>

          <p className="login-help">
            ¿Problemas con tu acceso? Escribe a <a href="mailto:repositorio@universidad.edu.co">repositorio@universidad.edu.co</a>
          </p>
        </div>
      </section>
    </div>
  )
}
