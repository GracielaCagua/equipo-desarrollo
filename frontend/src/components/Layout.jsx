import { useState } from 'react';

export function Layout({ children, page, setPage }) {
  const links = [
    ['categories', 'Categorías'],
    ['subcategories', 'Subcategorías'],
    ['artists', 'Artistas'],
    ['awards', 'Premios'],
    ['exhibitions', 'Exposiciones'],
    ['exposed-works', 'Obras Expuestas'],
    ['commercial', 'Ventas'],
    ['contact', 'Contacto'],
    ['messages', 'Bandeja Mensajes']
  ];

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Repositorio Universitario de Obras</span>
          <h1>Gestión Artística y Módulos Especiales</h1>
        </div>
        <nav>
          {links.map(([key, label]) => (
            <button
              className={page === key ? 'nav-active' : ''}
              onClick={() => setPage(key)}
              key={key}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer>
        Repositorio de Obras Universitarias — Premios, exposiciones, ventas y contacto.
      </footer>
    </div>
  );
}

export function Message({ error, success }) {
  if (!error && !success) return null;
  return <div className={error ? 'message error' : 'message success'}>{error || success}</div>;
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="modal">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose}>×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function EmptyState({ children }) {
  return <div className="empty">{children}</div>;
}
