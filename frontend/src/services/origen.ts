import api from '../config/api';

export const origenService = {
  get: (phone: string) => api.get(`/conversacion/${encodeURIComponent(phone)}/origen`),

  update: (phone: string, data: { origen: string; detalle?: string }) =>
    api.put(`/conversacion/${encodeURIComponent(phone)}/origen`, data),
};
