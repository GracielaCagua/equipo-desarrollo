import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EmptyState, Message, Modal } from '../components/Layout.jsx';

const blank = {
  title: '',
  description: '',
  artist_id: '',
  category_id: '',
  subcategory_id: '',
  publication_status: 'draft'
};

export function ArtworksPage() {
  const [result, setResult] = useState({ data: [] });
  const [artists, setArtists] = useState([]);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [form, setForm] = useState(blank);
  const [files, setFiles] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => api.artworks.list({ search }).then(setResult).catch((e) => setError(e.message));

  useEffect(() => {
    Promise.all([api.artists.list(), api.categories.list()])
      .then(([artistItems, categoryItems]) => {
        setArtists(artistItems);
        setCategories(categoryItems);
      })
      .catch((e) => setError(e.message));
    load();
  }, []);

  useEffect(() => {
    if (!form.category_id) {
      setSubcategories([]);
      return;
    }
    api.subcategories.list(form.category_id).then(setSubcategories).catch((e) => setError(e.message));
  }, [form.category_id]);

  useEffect(() => {
    load();
  }, [search]);

  const updateForm = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const artwork = await api.artworks.create({
        ...form,
        artist_id: Number(form.artist_id),
        category_id: Number(form.category_id),
        subcategory_id: Number(form.subcategory_id)
      });
      if (files.length) await api.artworks.upload(artwork.id, files);
      setSuccess('Obra guardada correctamente');
      setForm(blank);
      setFiles([]);
      setModal(false);
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const setStatus = async (id, publication_status) => {
    try {
      await api.artworks.status(id, publication_status);
      setSuccess('Estado de publicación actualizado');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('¿Eliminar esta obra y sus archivos?')) return;
    try {
      await api.artworks.delete(id);
      setSuccess('Obra eliminada');
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Catálogo multimedia</span>
          <h2>Obras</h2>
          <p>Registra obras, asígnalas a una categoría, subcategoría y artista, y carga sus archivos.</p>
        </div>
        <button onClick={() => { setForm(blank); setFiles([]); setModal(true); }}>Nueva obra</button>
      </div>
      <Message error={error} success={success} />
      <input className="search" placeholder="Buscar obra..." value={search} onChange={(e) => setSearch(e.target.value)} />
      {result.data?.length ? (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Obra</th><th>Artista</th><th>Clasificación</th><th>Publicación</th><th>Archivos</th><th>Acciones</th></tr></thead>
            <tbody>{result.data.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.title}</strong><div className="table-subtext">{item.description || 'Sin descripción'}</div></td>
                <td>{item.artist_name || item.artist_id}</td>
                <td>{item.category_name || item.category_id}<div className="table-subtext">{item.subcategory_name || item.subcategory_id}</div></td>
                <td><span className={`badge ${item.publication_status === 'published' ? 'active' : 'inactive'}`}>{item.publication_status}</span></td>
                <td>{item.files?.length || 0}</td>
                <td>
                  {item.publication_status !== 'published' && <button className="link-button" onClick={() => setStatus(item.id, 'published')}>Publicar</button>}
                  {item.publication_status === 'published' && <button className="link-button" onClick={() => setStatus(item.id, 'archived')}>Archivar</button>}
                  <button className="link-button link-danger" onClick={() => remove(item.id)}>Eliminar</button>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      ) : <EmptyState>No hay obras registradas.</EmptyState>}
      {modal && <Modal title="Nueva obra" onClose={() => setModal(false)}>
        <form onSubmit={save}>
          <label>Título<input required value={form.title} onChange={(e) => updateForm('title', e.target.value)} /></label>
          <label>Descripción<textarea value={form.description} onChange={(e) => updateForm('description', e.target.value)} /></label>
          <label>Artista<select required value={form.artist_id} onChange={(e) => updateForm('artist_id', e.target.value)}><option value="">Selecciona un artista</option>{artists.map((artist) => <option key={artist.id} value={artist.id}>{artist.full_name}</option>)}</select></label>
          <div className="grid-two">
            <label>Categoría<select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value, subcategory_id: '' })}><option value="">Selecciona</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Subcategoría<select required disabled={!form.category_id} value={form.subcategory_id} onChange={(e) => updateForm('subcategory_id', e.target.value)}><option value="">Selecciona</option>{subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}</select></label>
          </div>
          <label>Archivos (imagen, video, modelo 3D o documento)<input type="file" multiple onChange={(e) => setFiles([...e.target.files])} /></label>
          <div className="form-actions"><button type="button" className="secondary" onClick={() => setModal(false)}>Cancelar</button><button>Guardar obra</button></div>
        </form>
      </Modal>}
    </section>
  );
}
