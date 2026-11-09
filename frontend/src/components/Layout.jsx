import { useAuth } from '../auth/AuthContext.jsx';
import { ROLE_LABELS } from '../auth/permissions.js';

// links: [[clave, etiqueta], ...] ya filtrados por permisos en App.jsx
export function Layout({ children, page, setPage, links }) {
  const { user, logout } = useAuth();
  return (
    <div className="app-shell">
      <header className="topbar">
        <div><span className="eyebrow">Repositorio de obras</span><h1>Gestión artística</h1></div>
        <div className="session">
          <span><strong>{user.full_name}</strong> · {ROLE_LABELS[user.role] || user.role}</span>
          <button className="link-button" onClick={() => setPage('account')}>Mi cuenta</button>
          <button className="link-button" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>
      <nav className="main-nav">{links.map(([key, label]) => <button className={page === key ? 'nav-active' : ''} onClick={() => setPage(key)} key={key}>{label}</button>)}</nav>
      <main className="content">{children}</main>
    </div>
  );
}

export function Message({ error, success }) {
  if (!error && !success) return null;
  return <div className={error ? 'message error' : 'message success'}>{error || success}</div>;
}

export function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="modal"><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></div>{children}</section>
  </div>;
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}

