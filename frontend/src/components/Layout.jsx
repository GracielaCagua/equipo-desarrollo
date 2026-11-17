import { useState } from 'react';
import { api } from '../services/api.js';

export function Layout({ children, page, setPage }) {
  const [session, setSession] = useState(() => localStorage.getItem('access_token'));
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const links = [
    ['categories', 'Categorías'], ['subcategories', 'Subcategorías'], ['artists', 'Artistas'],
    ['artworks', 'Obras'], ['awards', 'Premios'], ['exhibitions', 'Exposiciones'],
    ['exposed-works', 'Obras Expuestas'], ['commercial', 'Ventas'], ['contact', 'Contacto'],
    ['messages', 'Bandeja Mensajes']
  ];

  const login = async (event) => {
    event.preventDefault();
    setLoginError('');
    try {
      const result = await api.auth.login(credentials);
      localStorage.setItem('access_token', result.token);
      setSession(result.token);
      setCredentials({ email: '', password: '' });
    } catch (error) {
      setLoginError(error.message);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark">G</div><div><span className="eyebrow">Galería universitaria</span><strong>Galeris</strong></div></div>
        <div className="sidebar-intro"><span className="eyebrow">Colección</span><h1>Obras que cuentan nuestra historia.</h1><p>Explora y administra el patrimonio artístico de la universidad.</p></div>
        <nav><span className="nav-label">Administrar colección</span>{links.map(([key, label]) => <button type="button" className={page === key ? 'nav-active' : ''} onClick={() => setPage(key)} key={key}>{label}</button>)}</nav>
        <footer>Repositorio de Obras Universitarias<br />© 2026</footer>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div><span className="eyebrow">Panel de gestión</span><h2>Gestión Artística y Módulos Especiales</h2></div>
          <form className="login-form" onSubmit={login}>
            {session ? <button type="button" className="secondary" onClick={() => { localStorage.removeItem('access_token'); setSession(null); }}>Cerrar sesión</button> : <><input aria-label="Correo administrativo" type="email" placeholder="Correo admin" required value={credentials.email} onChange={(e) => setCredentials({ ...credentials, email: e.target.value })} /><input aria-label="Contraseña administrativa" type="password" placeholder="Contraseña" required value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} /><button>Ingresar</button></>}
          </form>
          {loginError && <span className="login-error">{loginError}</span>}
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

export function Message({ error, success }) {
  if (!error && !success) return null;
  return <div className={error ? 'message error' : 'message success'}>{error || success}</div>;
}

export function Modal({ title, children, onClose }) {
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><section className="modal"><div className="modal-header"><h2>{title}</h2><button className="icon-button" onClick={onClose}>×</button></div>{children}</section></div>;
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}
