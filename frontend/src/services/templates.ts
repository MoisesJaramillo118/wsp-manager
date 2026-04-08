import api from '../config/api';

export const templateService = {
  list: (params?: { categoria?: string; search?: string }) =>
    api.get('/templates', { params }),

  getAll: async (params?: { categoria?: string; search?: string }) => {
    const { data } = await api.get('/templates', { params });
    return data;
  },

  create: (data: {
    nombre: string;
    categoria: string;
    contenido: string;
  }) => api.post('/templates', data),

  update: (id: number, data: Partial<{
    nombre: string;
    categoria: string;
    contenido: string;
    activo: boolean;
  }>) => api.put(`/templates/${id}`, data),

  delete: (id: number) => api.delete(`/templates/${id}`),
};
