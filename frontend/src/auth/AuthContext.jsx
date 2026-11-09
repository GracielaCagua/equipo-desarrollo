import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, session, SESSION_EXPIRED_EVENT } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(session.get()));
  const [notice, setNotice] = useState('');

  // Recupera la sesión si hay token guardado.
  useEffect(() => {
    if (!session.get()) return;
    api.auth.me().then(setUser).catch(() => session.clear()).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onExpired = () => { setUser(null); setNotice('Su sesión expiró. Inicie sesión nuevamente.'); };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: profile } = await api.auth.login(email, password);
    session.set(token);
    setNotice('');
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try { await api.auth.logout(); } catch { /* el token puede haber expirado */ }
    session.clear();
    setUser(null);
  }, []);

  const can = useCallback((permission) => Boolean(user?.permissions?.includes(permission)), [user]);

  const value = useMemo(() => ({ user, loading, notice, login, logout, can }), [user, loading, notice, login, logout, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return context;
}

// Muestra children solo si el usuario tiene el permiso (o fallback en caso contrario).
export function RequirePermission({ permission, children, fallback = null }) {
  const { can } = useAuth();
  return can(permission) ? children : fallback;
}
