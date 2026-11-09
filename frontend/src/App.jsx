import { useState } from 'react';
import { Layout } from './components/Layout.jsx';
import { CategoriesPage } from './pages/CategoriesPage.jsx';
import { SubcategoriesPage } from './pages/SubcategoriesPage.jsx';
import { ArtistsPage } from './pages/ArtistsPage.jsx';
import { AwardsPage } from './pages/AwardsPage.jsx';
import { ExhibitionsPage } from './pages/ExhibitionsPage.jsx';
import { ExposedWorksPage } from './pages/ExposedWorksPage.jsx';
import { CommercialStatusPage } from './pages/CommercialStatusPage.jsx';
import { ContactPage } from './pages/ContactPage.jsx';
import { MessagesInboxPage } from './pages/MessagesInboxPage.jsx';

export default function App() {
  const [page, setPage] = useState('awards');

  return (
    <Layout page={page} setPage={setPage}>
      {page === 'categories' && <CategoriesPage />}
      {page === 'subcategories' && <SubcategoriesPage />}
      {page === 'artists' && <ArtistsPage />}
      {page === 'awards' && <AwardsPage />}
      {page === 'exhibitions' && <ExhibitionsPage />}
      {page === 'exposed-works' && <ExposedWorksPage />}
      {page === 'commercial' && <CommercialStatusPage />}
      {page === 'contact' && <ContactPage />}
      {page === 'messages' && <MessagesInboxPage />}
    </Layout>
  );
}
