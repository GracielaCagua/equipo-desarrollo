import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { API_URL, USE_MOCK } from '../../api/client'
import { ROLE_LABELS } from '../../auth/permissions'
import { useAuth } from '../../auth/AuthContext'
import {
  IconArtwork,
  IconCategory,
  IconClose,
  IconDashboard,
  IconExternal,
  IconLogout,
  IconMenu,
  IconSubcategory,
  IconUsers,
} from '../icons'
import { Avatar } from '../ui/Avatar'

const NAV_ITEMS = [
  { to: '/', label: 'Panel general', icon: IconDashboard, end: true, permission: null },
  { to: '/obras', label: 'Obras', icon: IconArtwork, permission: 'artworks:write' as const },
  { to: '/categorias', label: 'Categorías', icon: IconCategory, permission: 'categories:write' as const },
  { to: '/subcategorias', label: 'Subcategorías', icon: IconSubcategory, permission: 'subcategories:write' as const },
  { to: '/artistas', label: 'Artistas', icon: IconUsers, permission: 'artists:write' as const },
  { to: '/usuarios', label: 'Usuarios', icon: IconUsers, permission: 'users:manage' as const },
]

const PUBLIC_URL = import.meta.env.VITE_PUBLIC_URL ?? '#'

function sectionTitle(pathname: string): string {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 0) return 'Panel general'
  if (parts[0] === 'obras') {
    if (parts[1] === 'nueva') return 'Nueva obra'
    if (parts[2] === 'editar') return 'Editar obra'
    return 'Obras'
  }
  if (parts[0] === 'categorias') return 'Categorías'
  if (parts[0] === 'subcategorias') return 'Subcategorías'
  if (parts[0] === 'artistas') return 'Artistas'
  if (parts[0] === 'usuarios') return 'Usuarios registrados'
  if (parts[0] === 'usuario') return 'Explorar repositorio'
  return 'Administración'
}

export function AdminLayout() {
  const { user, logout, can } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const title = sectionTitle(location.pathname)

  useEffect(() => {
    setOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  return (
    <div className="app-shell">
      {open && <button type="button" className="sidebar-overlay" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}

      <aside className={`sidebar${open ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-mark">RA</div>
          <div className="brand-text">
            <strong>Repositorio</strong>
            <span>de Arte Universitario</span>
          </div>
          <button type="button" className="sidebar-close" onClick={() => setOpen(false)} aria-label="Cerrar menú">
            <IconClose size={20} />
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          <span className="nav-label">Gestión</span>
          {NAV_ITEMS.filter((item) => {
            if (item.permission) return can(item.permission)
            return user.role !== 'editor'
          }).map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item${isActive ? ' nav-item-active' : ''}`}
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}

          <span className="nav-label nav-label-spaced">Recursos</span>
          <a className="nav-item" href={PUBLIC_URL} target="_blank" rel="noreferrer">
            <IconExternal size={19} />
            <span>Sitio público</span>
          </a>
        </nav>

        <div className="sidebar-foot">
          <div className="environment-pill">
            <span className={`status-dot ${USE_MOCK ? 'status-dot-demo' : 'status-dot-live'}`} />
            {USE_MOCK ? 'Modo demostración' : 'API conectada'}
          </div>
          {!USE_MOCK && <span className="environment-url">{API_URL}</span>}

          <div className="sidebar-user">
            <Avatar firstName={user.name.split(' ')[0]} lastName={user.name.split(' ').slice(-1)[0]} size="sm" />
            <div className="sidebar-user-info">
              <strong>{user.name}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
            <button type="button" className="sidebar-logout" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
              <IconLogout size={18} />
            </button>
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button type="button" className="icon-btn menu-toggle" onClick={() => setOpen(true)} aria-label="Abrir menú">
              <IconMenu size={21} />
            </button>
            <div className="breadcrumb">
              <span>Administración</span>
              <span className="breadcrumb-sep">/</span>
              <strong>{title}</strong>
            </div>
          </div>
          <div className="topbar-right">
            <a className="topbar-link" href={PUBLIC_URL} target="_blank" rel="noreferrer">
              <IconExternal size={16} />
              <span>Ver sitio público</span>
            </a>
            <div className="topbar-user">
              <Avatar firstName={user.name.split(' ')[0]} lastName={user.name.split(' ').slice(-1)[0]} size="sm" />
              <div className="topbar-user-info">
                <strong>{user.name}</strong>
                <span>{ROLE_LABELS[user.role]}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
