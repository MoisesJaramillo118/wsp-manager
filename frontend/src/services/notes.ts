import api from '../config/api';

export const noteService = {
  list: (phone: string) =>
    api.get(`/chats/${encodeURIComponent(phone)}/notes`),

  create: (phone: string, content: string) =>
    api.post(`/chats/${encodeURIComponent(phone)}/notes`, { content }),

  delete: (id: number) => api.delete(`/notes/${id}`),
};
