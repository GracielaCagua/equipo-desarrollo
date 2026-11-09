import { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../auth/AuthContext.jsx';
import { ROLE_LABELS } from '../auth/permissions.js';
import { EmptyState, Message, Modal } from '../components/Layout.jsx';

const blank = { full_name: '', email: '', role: 'editor', password: '' };

export function AdminUsersPage() {
  const { user: me } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [modal, setModal] = useState(false);
  const [resetting, setResetting] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => api.adminUsers.list().then(setItems).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const done = (message) => { setSuccess(message); setError(''); load(); };
  const fail = (e) => { setError(e.message); setSuccess(''); };

  const save = async (event) => {
    event.preventDefault();
    try {
      if (editing) await api.adminUsers.update(editing.id, { full_name: form.full_name, email: form.email, role: form.role });
      else await api.adminUsers.create(form);
      setModal(false); setForm(blank); setEditing(null);
      done('Administrador guardado correctamente');
    } catch (e) { fail(e); }
  };

  const toggle = async (item) => {
    try { await api.adminUsers.status(item.id, !item.is_active); done('Estado actualizado'); } catch (e) { fail(e); }
  };

  const reset = async (event) => {
    event.preventDefault();
    try { await api.adminUsers.resetPassword(resetting.id, newPassword); setResetting(null); setNewPassword(''); done('Contraseña restablecida'); } catch (e) { fail(e); }
  };

  return <section>
    <div className="page-heading">
      <div><span className="eyebrow">Seguridad</span><h2>Administradores</h2><p>Cuentas con acceso al panel y su rol.</p></div>
      <button onClick={() => { setEditing(null); setForm(blank); setModal(true); }}>Nuevo administrador</button>
    </div>
    <Message error={error} success={success} />
    {items.length ? <div className="table-wrap"><table>
      <thead><tr><th>Nombre</th><th>Correo</th><th>Rol</th><th>Último acceso</th><th>Estado</th><th>Acciones</th></tr></thead>
      <tbody>{items.map((item) => <tr key={item.id}>
        <td><strong>{item.full_name}</strong>{item.id === me.id && <span className="badge student you">Usted</span>}</td>
        <td>{item.email}</td>
        <td>{ROLE_LABELS[item.role] || item.role}</td>
        <td>{item.last_login_at ? new Date(item.last_login_at).toLocaleString() : '—'}</td>
        <td><span className={`badge ${item.is_active ? 'active' : 'inactive'}`}>{item.is_active ? 'Activo' : 'Inactivo'}</span></td>
        <td>
          <button className="link-button" onClick={() => { setEditing(item); setForm({ ...blank, full_name: item.full_name, email: item.email, role: item.role }); setModal(true); }}>Editar</button>
          <button className="link-button" onClick={() => { setResetting(item); setNewPassword(''); }}>Contraseña</button>
          {item.id !== me.id && <button className="link-button" onClick={() => toggle(item)}>{item.is_active ? 'Desactivar' : 'Activar'}</button>}
        </td>
      </tr>)}</tbody>
    </table></div> : <EmptyState>No hay administradores registrados.</EmptyState>}

    {modal && <Modal title={editing ? 'Editar administrador' : 'Nuevo administrador'} onClose={() => setModal(false)}>
      <form onSubmit={save}>
        <label>Nombre completo<input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
        <label>Correo<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Rol<select value={form.role} disabled={editing?.id === me.id} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
        {!editing && <label>Contraseña inicial<input type="password" autoComplete="new-password" required minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><small>Mínimo 10 caracteres, con letras y números.</small></label>}
        <div className="form-actions"><button type="button" className="secondary" onClick={() => setModal(false)}>Cancelar</button><button>Guardar</button></div>
      </form>
    </Modal>}

    {resetting && <Modal title={`Restablecer contraseña de ${resetting.full_name}`} onClose={() => setResetting(null)}>
      <form onSubmit={reset}>
        <label>Nueva contraseña<input type="password" autoComplete="new-password" required minLength={10} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><small>Mínimo 10 caracteres, con letras y números.</small></label>
        <div className="form-actions"><button type="button" className="secondary" onClick={() => setResetting(null)}>Cancelar</button><button>Restablecer</button></div>
      </form>
    </Modal>}
  </section>;
}
