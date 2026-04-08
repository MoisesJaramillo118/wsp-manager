import api from '../config/api';

export const reminderService = {
  list: (params?: { status?: string; advisor_id?: number }) =>
    api.get('/reminders', { params }),

  due: () => api.get('/reminders/due'),

  create: (data: {
    remote_phone: string;
    advisor_id: number;
    note: string;
    remind_at: string;
  }) => api.post('/reminders', data),

  update: (id: number, data: Partial<{
    note: string;
    remind_at: string;
    status: string;
  }>) => api.put(`/reminders/${id}`, data),

  delete: (id: number) => api.delete(`/reminders/${id}`),
};
