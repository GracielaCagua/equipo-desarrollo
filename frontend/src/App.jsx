import { useState } from 'react';
import { Layout } from './components/Layout.jsx';
import { CategoriesPage } from './pages/CategoriesPage.jsx';
import { SubcategoriesPage } from './pages/SubcategoriesPage.jsx';
import { ArtistsPage } from './pages/ArtistsPage.jsx';

export default function App() {
  const [page, setPage] = useState('categories');
  return <Layout page={page} setPage={setPage}>{page === 'categories' && <CategoriesPage />}{page === 'subcategories' && <SubcategoriesPage />}{page === 'artists' && <ArtistsPage />}</Layout>;
}

