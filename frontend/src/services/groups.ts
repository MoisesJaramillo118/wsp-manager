import api from '../config/api';

export const groupService = {
  list: () => api.get('/groups'),

  create: (data: { nombre: string; color: string }) =>
    api.post('/groups', data),

  update: (id: number, data: { nombre?: string; color?: string }) =>
    api.put(`/groups/${id}`, data),

  delete: (id: number) => api.delete(`/groups/${id}`),
};
