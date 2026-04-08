import api from '../config/api';

export const quickReplyService = {
  list: (params?: { categoria?: string; advisor_id?: number }) =>
    api.get('/quick-replies', { params }),

  create: (data: {
    titulo: string;
    categoria: string;
    contenido: string;
    advisor_id?: number | null;
  }) => api.post('/quick-replies', data),

  update: (id: number, data: Partial<{
    titulo: string;
    categoria: string;
    contenido: string;
    advisor_id: number | null;
    activo: boolean;
  }>) => api.put(`/quick-replies/${id}`, data),

  delete: (id: number) => api.delete(`/quick-replies/${id}`),
};
