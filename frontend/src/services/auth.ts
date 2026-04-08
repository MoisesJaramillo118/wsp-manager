import api from '../config/api';

export const authService = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),

  me: () => api.get('/auth/me'),

  profiles: () => api.get('/auth/profiles'),

  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/password', { current_password: currentPassword, new_password: newPassword }),

  createUser: (data: {
    nombre: string;
    email: string;
    password: string;
    rol: string;
    color?: string;
    especialidad?: string;
    local_tienda?: string;
    max_chats?: number;
  }) => api.post('/auth/users', data),

  resetPassword: (userId: number, newPassword: string) =>
    api.put(`/auth/users/${userId}/password`, { new_password: newPassword }),
};
