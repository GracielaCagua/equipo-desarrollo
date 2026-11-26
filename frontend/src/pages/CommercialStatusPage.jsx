import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EmptyState, Message } from '../components/Layout.jsx';

export function CommercialStatusPage() {
  const [works, setWorks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [commercialFilter, setCommercialFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadCategories = () => {
    api.categories.list().then(setCategories).catch(() => {});
  };

  useEffect(() => {
    loadCategories();
  }, []);

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

  const loadWorks = () => {
    api.works.list({
      category_id: categoryId,
      subcategory_id: subcategoryId,
      commercial_status: commercialFilter,
      search
    })
      .then(setWorks)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    loadWorks();
  }, [categoryId, subcategoryId, commercialFilter, search]);

  const toggleCommercialStatus = async (work) => {
    setError('');
    const newStatus = work.commercial_status === 'sold' || work.is_sold ? 'not_sold' : 'sold';
    try {
      await api.works.updateCommercialStatus(work.id, { commercial_status: newStatus });
      setSuccess(`Obra "${work.title}" actualizada a ${newStatus === 'sold' ? 'Vendida' : 'No vendida'}.`);
      loadWorks();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Gestión Comercial (Administración)</span>
          <h2>Estado Comercial de Obras</h2>
          <p>Control exclusivo de administración para cambiar el estado comercial de cada obra a vendida o no vendida.</p>
        </div>
      </div>

      <Message error={error} success={success} />

      <div className="toolbar filter-bar">
        <input
          className="search"
          placeholder="Buscar por obra o artista..."
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
          <option value="">Todas las disciplinas / categorías</option>
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
            {categoryId ? 'Todas las subcategorías' : 'Selecciona categoría primero'}
          </option>
          {subcategories.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          className="filter"
          value={commercialFilter}
          onChange={(e) => setCommercialFilter(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="not_sold">No vendidas (Disponibles)</option>
          <option value="sold">Vendidas</option>
        </select>
      </div>

      {works.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Obra</th>
                <th>Artista</th>
                <th>Categoría / Subcategoría</th>
                <th>Estado Comercial</th>
                <th>Exposiciones</th>
                <th>Acción Administrativa</th>
              </tr>
            </thead>
            <tbody>
              {works.map((work) => {
                const isSold = work.commercial_status === 'sold' || work.is_sold;
                return (
                  <tr key={work.id}>
                    <td><strong>{work.title}</strong></td>
                    <td>{work.artist_name}</td>
                    <td>
                      {work.category_name || '—'}
                      {work.subcategory_name ? ` / ${work.subcategory_name}` : ''}
                    </td>
                    <td>
                      <span className={`badge ${isSold ? 'inactive' : 'active'}`}>
                        {isSold ? 'Vendida' : 'No vendida'}
                      </span>
                    </td>
                    <td>{work.exhibitions_count || 0}</td>
                    <td>
                      <button
                        className={`link-button ${isSold ? 'link-success' : 'link-warning'}`}
                        onClick={() => toggleCommercialStatus(work)}
                      >
                        {isSold ? 'Marcar como no vendida' : 'Marcar como vendida'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No se encontraron obras registradas.</EmptyState>
      )}
    </section>
  );
}

