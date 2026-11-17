import { Link } from 'react-router-dom'
import { IconArrowLeft } from '../components/icons'

export function NotFoundPage() {
  return (
    <div className="not-found">
      <div className="not-found-inner">
        <span className="not-found-code">404</span>
        <h1>Esta página no está en el archivo</h1>
        <p>
          El enlace que buscas no existe o fue movido. Vuelve al panel para continuar gestionando el repositorio.
        </p>
        <Link to="/" className="btn btn-primary btn-sm">
          <IconArrowLeft size={16} /> Volver al panel
        </Link>
      </div>
    </div>
  )
}
