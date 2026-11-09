import { useState } from 'react';
import { api } from '../services/api.js';
import { Message } from '../components/Layout.jsx';

const blank = { current: '', next: '', confirm: '' };

export function ChangePasswordPage() {
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError(''); setSuccess('');
    if (form.next !== form.confirm) return setError('La confirmación no coincide con la nueva contraseña');
    try {
      await api.auth.changePassword(form.current, form.next);
      setForm(blank);
      setSuccess('Contraseña actualizada');
    } catch (e) { setError(e.message); }
  };

  return <section className="narrow">
    <div className="page-heading"><div><span className="eyebrow">Mi cuenta</span><h2>Cambiar contraseña</h2></div></div>
    <Message error={error} success={success} />
    <form className="card-form" onSubmit={submit}>
      <label>Contraseña actual<input type="password" autoComplete="current-password" required value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} /></label>
      <label>Nueva contraseña<input type="password" autoComplete="new-password" required minLength={10} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} /><small>Mínimo 10 caracteres, con letras y números.</small></label>
      <label>Confirmar nueva contraseña<input type="password" autoComplete="new-password" required value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} /></label>
      <div className="form-actions"><button>Actualizar</button></div>
    </form>
  </section>;
}
