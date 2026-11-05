const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación');
  return data;
}

export const api = {
  categories: {
    list: (search = '') => request(`/categories${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    create: (data) => request('/categories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    status: (id, is_active) => request(`/categories/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) })
  },
  subcategories: {
    list: (categoryId = '') => request(`/subcategories${categoryId ? `?category_id=${categoryId}` : ''}`),
    create: (data) => request('/subcategories', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/subcategories/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    status: (id, is_active) => request(`/subcategories/${id}/status`, { method: 'PATCH', body: JSON.stringify({ is_active }) })
  },
  artists: {
    list: (filters = {}) => {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      return request(`/artists${params.toString() ? `?${params}` : ''}`);
    },
    create: (data) => request('/artists', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/artists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    graduate: (id) => request(`/artists/${id}/academic-status`, { method: 'PATCH', body: JSON.stringify({ academic_status: 'graduate' }) }),
    works: (id) => request(`/artists/${id}/works`)
  }
};

