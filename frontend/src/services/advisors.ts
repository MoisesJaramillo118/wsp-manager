import api from '../config/api';

export const advisorService = {
  list: () => api.get('/advisors'),

  getAll: async () => {
    const { data } = await api.get('/advisors');
    return data;
  },

  create: (data: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    local_tienda?: string;
    especialidad?: string;
    max_chats?: number;
    color?: string;
  }) => api.post('/auth/users', data),

  update: (id: number, data: Partial<{
    nombre: string;
    email: string;
    password: string;
    rol: string;
    local_tienda: string;
    especialidad: string;
    max_chats: number;
    color: string;
    activo: boolean;
  }>) => api.put(`/advisors/${id}`, data),

  delete: (id: number) => api.delete(`/advisors/${id}`),

  assignments: () => api.get('/advisors/assignments'),
};
