import { useState } from 'react';
import { useAuth } from './auth/AuthContext.jsx';
import { PERMISSIONS } from './auth/permissions.js';
import { Layout } from './components/Layout.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { CategoriesPage } from './pages/CategoriesPage.jsx';
import { SubcategoriesPage } from './pages/SubcategoriesPage.jsx';
import { ArtistsPage } from './pages/ArtistsPage.jsx';
import { AdminUsersPage } from './pages/AdminUsersPage.jsx';
import { ChangePasswordPage } from './pages/ChangePasswordPage.jsx';

// Registro de páginas del panel. Para agregar un módulo: añadir una entrada con
// el permiso que exige (null = cualquier administrador autenticado).
const PAGES = [
  { key: 'categories', label: 'Categorías', permission: PERMISSIONS.CATALOG_WRITE, Component: CategoriesPage },
  { key: 'subcategories', label: 'Subcategorías', permission: PERMISSIONS.CATALOG_WRITE, Component: SubcategoriesPage },
  { key: 'artists', label: 'Artistas', permission: PERMISSIONS.CATALOG_WRITE, Component: ArtistsPage },
  { key: 'admin-users', label: 'Administradores', permission: PERMISSIONS.USERS_MANAGE, Component: AdminUsersPage },
  { key: 'account', label: null, permission: null, Component: ChangePasswordPage }
];

export default function App() {
  const { user, loading, can } = useAuth();
  const [page, setPage] = useState('categories');

  if (loading) return <div className="login-shell"><p>Cargando…</p></div>;
  if (!user) return <LoginPage />;

  const allowed = PAGES.filter((p) => !p.permission || can(p.permission));
  const current = allowed.find((p) => p.key === page) || allowed[0];
  const links = allowed.filter((p) => p.label).map((p) => [p.key, p.label]);

  return <Layout page={current.key} setPage={setPage} links={links}><current.Component /></Layout>;
}
