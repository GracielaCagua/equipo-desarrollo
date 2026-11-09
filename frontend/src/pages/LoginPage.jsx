import { useState } from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import { Message } from '../components/Layout.jsx';

export function LoginPage() {
  const { login, notice } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      await login(form.email, form.password);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">Repositorio de obras</span>
        <h1>Acceso administrativo</h1>
        <p className="login-help">Ingrese con su cuenta institucional de administrador.</p>
        <Message error={error || notice} />
        <label>Correo
          <input type="email" autoComplete="username" required autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Contraseña
          <input type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        <button disabled={sending}>{sending ? 'Ingresando…' : 'Ingresar'}</button>
      </form>
    </div>
  );
}
