import api from '../config/api';
import type { ConversationStatus } from '../types';

export const chatService = {
  list: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    advisor_id?: number;
  }) => api.get('/chats', { params }),

  detail: (phone: string) =>
    api.get(`/chats/${encodeURIComponent(phone)}`),

  send: (phone: string, message: string) =>
    api.post(`/chats/${encodeURIComponent(phone)}/send`, { message }),

  assign: (phone: string, advisorId: number | null) =>
    api.put(`/chats/${encodeURIComponent(phone)}/assign`, {
      advisor_id: advisorId,
    }),

  status: (phone: string, status: ConversationStatus) =>
    api.put(`/chats/${encodeURIComponent(phone)}/status`, { status }),

  outcome: (phone: string, outcome: string) =>
    api.put(`/chats/${encodeURIComponent(phone)}/outcome`, { outcome }),

  tags: (phone: string) =>
    api.get(`/chats/${encodeURIComponent(phone)}/tags`),

  notes: (phone: string) =>
    api.get(`/chats/${encodeURIComponent(phone)}/notes`),
};
