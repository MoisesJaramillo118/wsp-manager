import api from '../config/api';

export const messagingService = {
  sendIndividual: (data: {
    contact_id: number;
    contenido: string;
    template_id?: number | null;
  }) => api.post('/send/individual', data),

  sendBulk: (data: {
    contact_ids?: number[];
    grupo_id?: number;
    contenido: string;
    template_id?: number | null;
  }) => api.post('/send/bulk', data),

  sendSchedule: (data: {
    contact_ids?: number[];
    grupo_id?: number;
    contenido: string;
    template_id?: number | null;
    scheduled_at: string;
  }) => api.post('/send/schedule', data),
};
