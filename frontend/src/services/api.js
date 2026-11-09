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

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
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
    list: (filters = {}) => request(`/artists${buildQuery(filters)}`),
    create: (data) => request('/artists', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/artists/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    graduate: (id) => request(`/artists/${id}/academic-status`, { method: 'PATCH', body: JSON.stringify({ academic_status: 'graduate' }) }),
    works: (id) => request(`/artists/${id}/works`)
  },
  awards: {
    list: (filters = {}) => request(`/awards${buildQuery(filters)}`),
    get: (id) => request(`/awards/${id}`),
    create: (data) => request('/awards', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/awards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/awards/${id}`, { method: 'DELETE' })
  },
  exhibitions: {
    list: (filters = {}) => request(`/exhibitions${buildQuery(filters)}`),
    get: (id) => request(`/exhibitions/${id}`),
    create: (data) => request('/exhibitions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id, data) => request(`/exhibitions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id) => request(`/exhibitions/${id}`, { method: 'DELETE' }),
    exposedWorks: (filters = {}) => request(`/exhibitions/exposed-works${buildQuery(filters)}`)
  },
  works: {
    list: (filters = {}) => request(`/works${buildQuery(filters)}`),
    get: (id) => request(`/works/${id}`),
    updateCommercialStatus: (id, statusData) => request(`/works/${id}/commercial-status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData)
    })
  },
  contact: {
    submit: (data) => request('/contact', { method: 'POST', body: JSON.stringify(data) }),
    messages: (filters = {}) => request(`/contact/messages${buildQuery(filters)}`),
    getMessage: (id) => request(`/contact/messages/${id}`),
    updateStatus: (id, status) => request(`/contact/messages/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
    deleteMessage: (id) => request(`/contact/messages/${id}`, { method: 'DELETE' })
  }
};
