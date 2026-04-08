import api from '../config/api';
import type { AlertasConfig } from '../types';

export const alertService = {
  getConfig: () =>
    api.get<AlertasConfig>('/alertas/config'),

  updateConfig: (data: Partial<{
    minutos_sin_responder: number;
    activo: boolean;
    notificar_admin: boolean;
  }>) => api.put('/alertas/config', data),

  sinResponder: () =>
    api.get('/alertas/sin-responder'),
};
