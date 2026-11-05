import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { EmptyState, Message, Modal } from '../components/Layout.jsx';

const blank = { name: '', description: '' };
export function CategoriesPage() {
  const [items, setItems] = useState([]); const [form, setForm] = useState(blank); const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState(''); const [modal, setModal] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const load = () => api.categories.list(search).then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, [search]);
  const save = async (event) => { event.preventDefault(); setError(''); try { editing ? await api.categories.update(editing.id, form) : await api.categories.create(form); setSuccess('Categoría guardada correctamente'); setModal(false); setForm(blank); setEditing(null); load(); } catch (e) { setError(e.message); } };
  const toggle = async (item) => { try { await api.categories.status(item.id, !item.is_active); setSuccess('Estado actualizado'); load(); } catch (e) { setError(e.message); } };
  return <section><div className="page-heading"><div><span className="eyebrow">Clasificación</span><h2>Categorías</h2><p>Administra las disciplinas del repositorio.</p></div><button onClick={() => { setEditing(null); setForm(blank); setModal(true); }}>Nueva categoría</button></div>
    <Message error={error} success={success} /><input className="search" placeholder="Buscar categoría..." value={search} onChange={(e) => setSearch(e.target.value)} />
    {items.length ? <div className="table-wrap"><table><thead><tr><th>Nombre</th><th>Descripción</th><th>Subcategorías</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.name}</strong></td><td>{item.description || '—'}</td><td>{item.subcategory_count}</td><td><span className={`badge ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Activa' : 'Inactiva'}</span></td><td><button className="link-button" onClick={() => { setEditing(item); setForm({ name: item.name, description: item.description || '' }); setModal(true); }}>Editar</button><button className="link-button" onClick={() => toggle(item)}>{item.is_active ? 'Desactivar' : 'Activar'}</button></td></tr>)}</tbody></table></div> : <EmptyState>No hay categorías registradas.</EmptyState>}
    {modal && <Modal title={editing ? 'Editar categoría' : 'Nueva categoría'} onClose={() => setModal(false)}><form onSubmit={save}><label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label><label>Descripción<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label><div className="form-actions"><button type="button" className="secondary" onClick={() => setModal(false)}>Cancelar</button><button>Guardar</button></div></form></Modal>}
  </section>;
}

