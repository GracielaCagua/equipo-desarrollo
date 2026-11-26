import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EmptyState, Message, Modal } from '../components/Layout.jsx';

const blank = { title: '', location: '', start_date: '', end_date: '', description: '', work_ids: [] };

export function ExhibitionsPage() {
  const [items, setItems] = useState([]);
  const [allWorks, setAllWorks] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [galleryModal, setGalleryModal] = useState(null);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    api.exhibitions.list({ search })
      .then(setItems)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    api.works.list().then(setAllWorks).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [search]);

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setModal(true);
  };

  const openEdit = async (item) => {
    try {
      const full = await api.exhibitions.get(item.id);
      setEditing(full);
      setForm({
        title: full.title,
        location: full.location,
        start_date: full.start_date || '',
        end_date: full.end_date || '',
        description: full.description || '',
        work_ids: (full.gallery || []).map((w) => w.work_id)
      });
      setModal(true);
    } catch (e) {
      setError(e.message);
    }
  };

  const openGallery = async (item) => {
    try {
      const full = await api.exhibitions.get(item.id);
      setGalleryModal(full);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleWorkToggle = (workId) => {
    setForm((prev) => {
      const current = prev.work_ids || [];
      const updated = current.includes(workId)
        ? current.filter((id) => id !== workId)
        : [...current, workId];
      return { ...prev, work_ids: updated };
    });
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.exhibitions.update(editing.id, form);
        setSuccess('Exposición actualizada con éxito');
      } else {
        await api.exhibitions.create(form);
        setSuccess('Exposición creada con éxito');
      }
      setModal(false);
      setForm(blank);
      setEditing(null);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Está seguro de eliminar esta exposición?')) return;
    try {
      await api.exhibitions.delete(id);
      setSuccess('Exposición eliminada');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Eventos y Muestras</span>
          <h2>Módulo de Exposiciones</h2>
          <p>Organiza exposiciones con ubicación, fechas, descripción y galería de obras.</p>
        </div>
        <button onClick={openCreate}>Nueva exposición</button>
      </div>

      <Message error={error} success={success} />

      <input
        className="search"
        placeholder="Buscar exposición por título, ubicación o descripción..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {items.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Título</th>
                <th>Ubicación</th>
                <th>Fechas</th>
                <th>Galería</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.title}</strong>
                    {item.description && <p className="table-subtext">{item.description}</p>}
                  </td>
                  <td>{item.location}</td>
                  <td>
                    {item.start_date} {item.end_date ? `hasta ${item.end_date}` : ''}
                  </td>
                  <td>
                    <button className="link-button" onClick={() => openGallery(item)}>
                      Ver galería ({item.gallery_count} obras)
                    </button>
                  </td>
                  <td>
                    <button className="link-button" onClick={() => openEdit(item)}>
                      Editar
                    </button>
                    <button className="link-button link-danger" onClick={() => remove(item.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState>No hay exposiciones registradas.</EmptyState>
      )}

      {modal && (
        <Modal title={editing ? 'Editar exposición' : 'Nueva exposición'} onClose={() => setModal(false)}>
          <form onSubmit={save}>
            <label>
              Título de la exposición
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ej. Salón Anual de Bellas Artes"
              />
            </label>

            <label>
              Ubicación
              <input
                required
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="Ej. Galería Principal, Bloque C"
              />
            </label>

            <div className="grid-two">
              <label>
                Fecha de inicio
                <input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </label>

              <label>
                Fecha de finalización (opcional)
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </label>
            </div>

            <label>
              Descripción
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Propuesta curatorial y temas de la muestra..."
              />
            </label>

            <label>
              Obras de la Galería
              {allWorks.length > 0 ? (
                <div className="checkbox-group">
                  {allWorks.map((work) => (
                    <label key={work.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={(form.work_ids || []).includes(work.id)}
                        onChange={() => handleWorkToggle(work.id)}
                      />
                      <span>
                        <strong>{work.title}</strong> — {work.artist_name || 'Artista'}
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="table-subtext">No hay obras registradas en el repositorio para añadir a la galería.</p>
              )}
            </label>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button>Guardar exposición</button>
            </div>
          </form>
        </Modal>
      )}

      {galleryModal && (
        <Modal title={`Galería: ${galleryModal.title}`} onClose={() => setGalleryModal(null)}>
          <div className="profile">
            <p><strong>Ubicación:</strong> {galleryModal.location}</p>
            <p><strong>Fechas:</strong> {galleryModal.start_date} {galleryModal.end_date ? `a ${galleryModal.end_date}` : ''}</p>
            {galleryModal.description && <p>{galleryModal.description}</p>}
            <h4>Obras expuestas en esta galería</h4>
            {galleryModal.gallery && galleryModal.gallery.length > 0 ? (
              <div className="cards-grid">
                {galleryModal.gallery.map((work) => (
                  <div key={work.work_id} className="card-item">
                    <h4>{work.title}</h4>
                    <p className="table-subtext">Por: {work.artist_name}</p>
                    <p className="table-subtext">
                      {work.category_name} {work.subcategory_name ? `• ${work.subcategory_name}` : ''}
                    </p>
                    <span className={`badge ${work.commercial_status === 'sold' || work.is_sold ? 'inactive' : 'active'}`}>
                      {work.commercial_status === 'sold' || work.is_sold ? 'Vendida' : 'Disponible'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p>Esta exposición aún no tiene obras asignadas en su galería.</p>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

