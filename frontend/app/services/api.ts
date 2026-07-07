import axios from 'axios';

const api = axios.create({
  baseURL: '/api',   // relative → goes through Vite proxy, tidak bypass ke localhost:8000 langsung
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // Untuk sekarang tidak redirect ke halaman login.
    // Kita hanya pakai dashboard sebagai entry point sementara.
    const url = err.config?.url ?? '';
    const isSyncRequest = url.includes('/sync');

    if (err.response?.status === 401 && !isSyncRequest) {
      localStorage.removeItem('token');
      // tidak redirect, biarkan komponen menangani error atau fallback ke dashboard
    }
    return Promise.reject(err);
  }
);

export const templateService = {
  getAll:   ()             => api.get('/templates'),
  getById:  (id: number)   => api.get(`/templates/${id}`),
  create:   (data: FormData) =>
    api.post('/templates', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export const letterService = {
  getAll:    (params?: { status?: string }) => {
    const reqParams = params ? { ...params } : undefined;
    if (reqParams && reqParams.status === 'pending_approval') {
      reqParams.status = 'pending';
    }
    return api.get('/letters', { params: reqParams });
  },
  getById:   (id: number)                   => api.get(`/letters/${id}`),
  create:    (data: Record<string, any>)    => api.post('/letters', data),
  approve:   (id: number, catatan?: string) => api.patch(`/letters/${id}/approve`, { catatan }),
  reject:    (id: number, catatan: string)  => api.patch(`/letters/${id}/reject`, { catatan }),
  exportDoc: (id: number, format: 'docx' | 'pdf') =>
    api.get(`/letters/${id}/export`, { params: { format }, responseType: 'blob' }),
  syncCsv:   (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/sync/csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export default api;