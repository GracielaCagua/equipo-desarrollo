import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EmptyState, Message } from '../components/Layout.jsx';

export function ExposedWorksPage() {
  const [works, setWorks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [commercialStatus, setCommercialStatus] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  // Cargar categorías del repositorio
  useEffect(() => {
    api.categories.list().then(setCategories).catch(() => {});
  }, []);

  // Cargar subcategorías al seleccionar categoría
  useEffect(() => {
    if (categoryId) {
      api.subcategories.list(categoryId)
        .then(setSubcategories)
        .catch(() => setSubcategories([]));
    } else {
      setSubcategories([]);
      setSubcategoryId('');
    }
  }, [categoryId]);

  // Cargar obras expuestas aplicando filtros de categorías, subcategorías y estado
  const loadExposedWorks = () => {
    api.exhibitions.exposedWorks({
      category_id: categoryId,
      subcategory_id: subcategoryId,
      commercial_status: commercialStatus,
      search
    })
      .then(setWorks)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadExposedWorks();
  }, [categoryId, subcategoryId, commercialStatus, search]);

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Catálogo en Exposición</span>
          <h2>Sección Especial: Obras Expuestas</h2>
          <p>Consulta las obras presentadas en muestras y galerías, con filtros por categorías y subcategorías del repositorio.</p>
        </div>
      </div>

      <Message error={error} />

      <div className="toolbar filter-bar">
        <input
          className="search"
          placeholder="Buscar por obra, artista o exposición..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter"
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
            setSubcategoryId('');
          }}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          className="filter"
          value={subcategoryId}
          disabled={!categoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
        >
          <option value="">
            {categoryId ? 'Todas las subcategorías' : 'Selecciona una categoría primero'}
          </option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="filter"
          value={commercialStatus}
          onChange={(e) => setCommercialStatus(e.target.value)}
        >
          <option value="">Todos los estados comerciales</option>
          <option value="not_sold">Disponibles / No vendidas</option>
          <option value="sold">Vendidas</option>
        </select>
      </div>

      {works.length ? (
        <div className="cards-grid">
          {works.map((work, idx) => (
            <div key={`${work.work_id}-${work.exhibition_id}-${idx}`} className="card-item work-card">
              <div className="card-header-line">
                <span className="badge category-badge">{work.category_name || 'Sin categoría'}</span>
                {work.subcategory_name && (
                  <span className="badge subcategory-badge">{work.subcategory_name}</span>
                )}
                <span className={`badge ${work.commercial_status === 'sold' || work.is_sold ? 'inactive' : 'active'}`}>
                  {work.commercial_status === 'sold' || work.is_sold ? 'Vendida' : 'Disponible'}
                </span>
              </div>

              <h3>{work.work_title}</h3>
              <p className="artist-name">
                <strong>Artista:</strong> {work.artist_name}{' '}
                <span className="table-subtext">({work.academic_status === 'student' ? 'Estudiante' : 'Graduado'})</span>
              </p>

              <div className="exhibition-context">
                <p><strong>Exposición:</strong> {work.exhibition_title}</p>
                <p className="table-subtext">📍 {work.exhibition_location}</p>
                <p className="table-subtext">
                  🗓️ {work.exhibition_start_date} {work.exhibition_end_date ? `a ${work.exhibition_end_date}` : ''}
                </p>
                {work.curator_notes && (
                  <p className="curator-notes"><em>Nota: {work.curator_notes}</em></p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState>No se encontraron obras expuestas con los filtros seleccionados.</EmptyState>
      )}
    </section>
  );
}

