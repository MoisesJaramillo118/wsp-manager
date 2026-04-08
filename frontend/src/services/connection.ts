import api from '../config/api';

export const connectionService = {
  create: () =>
    api.post('/connection/create'),

  createWithCode: (phoneNumber: string) =>
    api.post('/connection/create-with-code', { phoneNumber }),

  status: () =>
    api.get('/connection/status'),

  qr: () =>
    api.get('/connection/qr'),

  instances: () => api.get('/connection/instances'),

  logout: () =>
    api.post('/connection/logout'),

  restart: () =>
    api.post('/connection/restart'),

  deleteInstance: () =>
    api.delete('/connection/delete'),
};
