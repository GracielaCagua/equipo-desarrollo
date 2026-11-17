import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EmptyState, Message, Modal } from '../components/Layout.jsx';

const blank = { name: '', description: '', award_date: '', artist_id: '', work_ids: [] };

export function AwardsPage() {
  const [items, setItems] = useState([]);
  const [artists, setArtists] = useState([]);
  const [artistWorks, setArtistWorks] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [selectedAward, setSelectedAward] = useState(null);
  const [search, setSearch] = useState('');
  const [artistFilter, setArtistFilter] = useState('');
  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    api.awards.list({ search, artist_id: artistFilter })
      .then(setItems)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    api.artists.list().then(setArtists).catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [search, artistFilter]);

  // Al cambiar de artista en el formulario, cargar sus obras
  const handleArtistChange = async (artistId) => {
    setForm((prev) => ({ ...prev, artist_id: artistId, work_ids: [] }));
    if (!artistId) {
      setArtistWorks([]);
      return;
    }
    try {
      const works = await api.artists.works(artistId);
      setArtistWorks(works);
    } catch {
      setArtistWorks([]);
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

  const openCreate = () => {
    setEditing(null);
    setForm(blank);
    setArtistWorks([]);
    setModal(true);
  };

  const openEdit = async (item) => {
    setEditing(item);
    const workIds = (item.related_works || []).map((w) => w.id);
    setForm({
      name: item.name,
      description: item.description || '',
      award_date: item.award_date || '',
      artist_id: item.artist_id,
      work_ids: workIds
    });
    try {
      const works = await api.artists.works(item.artist_id);
      setArtistWorks(works);
    } catch {
      setArtistWorks([]);
    }
    setModal(true);
  };

  const save = async (event) => {
    event.preventDefault();
    setError('');
    try {
      if (editing) {
        await api.awards.update(editing.id, form);
        setSuccess('Premio actualizado correctamente');
      } else {
        await api.awards.create(form);
        setSuccess('Premio registrado con éxito');
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
    if (!window.confirm('¿Está seguro de eliminar este premio?')) return;
    try {
      await api.awards.delete(id);
      setSuccess('Premio eliminado');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Reconocimientos</span>
          <h2>Módulo de Premios</h2>
          <p>Registra premios y galardones asociados a artistas y sus obras.</p>
        </div>
        <button onClick={openCreate}>Nuevo premio</button>
      </div>

      <Message error={error} success={success} />

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por premio o artista..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="filter"
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
        >
          <option value="">Todos los artistas</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>
      </div>

      {items.length ? (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Premio</th>
                <th>Fecha</th>
                <th>Artista</th>
                <th>Obras relacionadas</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <strong>{item.name}</strong>
                    {item.description && <p className="table-subtext">{item.description}</p>}
                  </td>
                  <td>{item.award_date}</td>
                  <td>{item.artist_name}</td>
                  <td>
                    {item.related_works && item.related_works.length > 0 ? (
                      <span className="badge active">
                        {item.related_works.length} obra(s)
                      </span>
                    ) : (
                      <span className="table-subtext">Ninguna</span>
                    )}
                  </td>
                  <td>
                    <button className="link-button" onClick={() => setSelectedAward(item)}>
                      Ver
                    </button>
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
        <EmptyState>No hay premios registrados.</EmptyState>
      )}

      {modal && (
        <Modal title={editing ? 'Editar premio' : 'Nuevo premio'} onClose={() => setModal(false)}>
          <form onSubmit={save}>
            <label>
              Nombre del premio
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ej. Primer Puesto Salón Universitario"
              />
            </label>

            <div className="grid-two">
              <label>
                Fecha
                <input
                  type="date"
                  required
                  value={form.award_date}
                  onChange={(e) => setForm({ ...form, award_date: e.target.value })}
                />
              </label>

              <label>
                Artista premiado
                <select
                  required
                  value={form.artist_id}
                  onChange={(e) => handleArtistChange(e.target.value)}
                >
                  <option value="">Seleccione un artista...</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.full_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Descripción
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Detalles del reconocimiento..."
              />
            </label>

            <label>
              Obras relacionadas del artista
              {artistWorks.length > 0 ? (
                <div className="checkbox-group">
                  {artistWorks.map((work) => (
                    <label key={work.id} className="checkbox-item">
                      <input
                        type="checkbox"
                        checked={(form.work_ids || []).includes(work.id)}
                        onChange={() => handleWorkToggle(work.id)}
                      />
                      <span>{work.title}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <p className="table-subtext">
                  {form.artist_id
                    ? 'Este artista no tiene obras registradas aún.'
                    : 'Seleccione un artista primero para ver sus obras.'}
                </p>
              )}
            </label>

            <div className="form-actions">
              <button type="button" className="secondary" onClick={() => setModal(false)}>
                Cancelar
              </button>
              <button>Guardar</button>
            </div>
          </form>
        </Modal>
      )}

      {selectedAward && (
        <Modal title="Detalles del Premio" onClose={() => setSelectedAward(null)}>
          <div className="profile">
            <h3>{selectedAward.name}</h3>
            <p><strong>Fecha:</strong> {selectedAward.award_date}</p>
            <p><strong>Artista:</strong> {selectedAward.artist_name} ({selectedAward.artist_email})</p>
            {selectedAward.description && <p><strong>Descripción:</strong> {selectedAward.description}</p>}
            <h4>Obras relacionadas</h4>
            {selectedAward.related_works && selectedAward.related_works.length ? (
              <ul>
                {selectedAward.related_works.map((w) => (
                  <li key={w.id}>{w.title}</li>
                ))}
              </ul>
            ) : (
              <p>No se especificaron obras específicas para este reconocimiento.</p>
            )}
          </div>
        </Modal>
      )}
    </section>
  );
}

