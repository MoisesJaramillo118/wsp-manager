import api from '../config/api';

export const turnoService = {
  checkIn: () => api.post('/auth/check-in'),
  checkOut: () => api.post('/auth/check-out'),
  active: () => api.get('/advisors/active'),
};
