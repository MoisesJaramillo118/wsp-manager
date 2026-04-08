import api from '../config/api';

export const contactService = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    grupo_id?: number;
  }) => api.get('/contacts', { params }),

  all: () => api.get('/contacts/all'),

  getPaginated: async (page?: number, limit?: number, search?: string, grupo_id?: number) => {
    const { data } = await api.get('/contacts', { params: { page, limit, search, grupo_id } });
    return data;
  },

  getAll: async () => {
    const { data } = await api.get('/contacts/all');
    return data;
  },

  getGroups: async () => {
    const { data } = await api.get('/groups');
    return data;
  },

  createGroup: (data: {
    nombre: string;
    color?: string;
  }) => api.post('/groups', data),

  deleteGroup: (id: number) => api.delete(`/groups/${id}`),

  create: (data: {
    nombre: string;
    telefono: string;
    grupo_id?: number | null;
    notas?: string;
  }) => api.post('/contacts', data),

  update: (id: number, data: Partial<{
    nombre: string;
    telefono: string;
    grupo_id: number | null;
    notas: string;
    activo: boolean;
  }>) => api.put(`/contacts/${id}`, data),

  delete: (id: number) => api.delete(`/contacts/${id}`),

  import: (formData: FormData) =>
    api.post('/contacts/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  export: () =>
    api.get('/contacts/export', { responseType: 'blob' }),
};
