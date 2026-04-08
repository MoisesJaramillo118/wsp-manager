import api from '../config/api';

export const catalogService = {
  list: (params?: { categoria?: string; search?: string }) =>
    api.get('/catalogs', { params }),

  create: (formData: FormData) =>
    api.post('/catalogs', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update: (id: number, data: Partial<{
    nombre: string;
    categoria: string;
    descripcion: string;
    keywords: string;
    activo: boolean;
  }>) => api.put(`/catalogs/${id}`, data),

  delete: (id: number) => api.delete(`/catalogs/${id}`),

  send: (catalogId: number, phone: string) =>
    api.post(`/catalogs/${catalogId}/send`, { phone }),
};
