const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'repositorio.token';

// sessionStorage: la sesión se cierra al cerrar la pestaña/navegador.
export const session = {
  get: () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } },
  set: (token) => { try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* sin almacenamiento */ } },
  clear: () => { try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ } }
};

// AuthContext escucha este evento para volver al login cuando el token expira.
export const SESSION_EXPIRED_EVENT = 'repositorio:session-expired';

async function request(path, options = {}) {
  const token = session.get();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });
  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (response.status === 401 && token) {
    session.clear();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
  }
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación');
  return data;
}

const json = (method, data) => ({ method, body: JSON.stringify(data) });

export const api = {
  request,
  auth: {
    login: (email, password) => request('/auth/login', json('POST', { email, password })),
    me: () => request('/auth/me'),
    logout: () => request('/auth/logout', { method: 'POST' }),
    changePassword: (current_password, new_password) => request('/auth/change-password', json('POST', { current_password, new_password }))
  },
  adminUsers: {
    list: () => request('/admin-users'),
    create: (data) => request('/admin-users', json('POST', data)),
    update: (id, data) => request(`/admin-users/${id}`, json('PUT', data)),
    status: (id, is_active) => request(`/admin-users/${id}/status`, json('PATCH', { is_active })),
    resetPassword: (id, password) => request(`/admin-users/${id}/password`, json('PATCH', { password }))
  },
  categories: {
    list: (search = '') => request(`/categories${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (data) => request('/categories', json('POST', data)),
    update: (id, data) => request(`/categories/${id}`, json('PUT', data)),
    status: (id, is_active) => request(`/categories/${id}/status`, json('PATCH', { is_active }))
  },
  subcategories: {
    list: (categoryId = '') => request(`/subcategories${categoryId ? `?category_id=${categoryId}` : ''}`),
    create: (data) => request('/subcategories', json('POST', data)),
    update: (id, data) => request(`/subcategories/${id}`, json('PUT', data)),
    status: (id, is_active) => request(`/subcategories/${id}/status`, json('PATCH', { is_active }))
  },
  artists: {
    list: (filters = {}) => {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      return request(`/artists${params.toString() ? `?${params}` : ''}`);
    },
    create: (data) => request('/artists', json('POST', data)),
    update: (id, data) => request(`/artists/${id}`, json('PUT', data)),
    graduate: (id) => request(`/artists/${id}/academic-status`, json('PATCH', { academic_status: 'graduate' })),
    works: (id) => request(`/artists/${id}/works`)
  }
};
