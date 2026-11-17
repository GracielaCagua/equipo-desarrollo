import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AdminLayout } from './components/layout/AdminLayout'
import { ToastProvider } from './components/ToastProvider'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ArtworksListPage } from './pages/artworks/ArtworksListPage'
import { ArtworkFormPage } from './pages/artworks/ArtworkFormPage'
import { CategoriesPage } from './pages/categories/CategoriesPage'
import { SubcategoriesPage } from './pages/categories/SubcategoriesPage'
import { ArtistsPage } from './pages/artists/ArtistsPage'
import { UsersPage } from './pages/UsersPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AdminLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="obras" element={<ArtworksListPage />} />
                <Route path="obras/nueva" element={<ArtworkFormPage mode="create" />} />
                <Route path="obras/:id/editar" element={<ArtworkFormPage mode="edit" />} />
                <Route path="categorias" element={<CategoriesPage />} />
                <Route path="subcategorias" element={<SubcategoriesPage />} />
                <Route path="artistas" element={<ArtistsPage />} />
                <Route path="usuarios" element={<UsersPage />} />
                <Route path="*" element={<NotFoundPage />} />
              </Route>
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
