import api from '../config/api';

export const tagService = {
  list: () => api.get('/tags'),

  create: (data: { nombre: string; color: string }) =>
    api.post('/tags', data),

  delete: (id: number) => api.delete(`/tags/${id}`),
};
