import api from '../config/api';
import type { Conversation, ChatMessage } from '../types';

export interface ChatStats {
  sin_responder: number;
  sin_asignar: number;
  necesita_asesor: number;
  asignados: number;
  total: number;
}

export interface ChatDetail {
  conversation: Conversation & { outcome?: string };
  messages: ChatMessage[];
}

export const chatService = {
  async getChats(status?: string): Promise<Conversation[]> {
    const url = status ? `/chats?status=${status}` : '/chats';
    const { data } = await api.get(url);
    return data;
  },

  async getChatStats(): Promise<ChatStats> {
    const { data } = await api.get('/chats/stats');
    return data;
  },

  async getChatDetail(phone: string): Promise<ChatDetail> {
    const { data } = await api.get(`/chats/${phone}`);
    return data;
  },

  async sendMessage(phone: string, message: string): Promise<void> {
    await api.post(`/chats/${phone}/send`, { message });
  },

  async assignAdvisor(phone: string, advisorId: number | null): Promise<void> {
    await api.put(`/chats/${phone}/assign`, { advisor_id: advisorId });
  },

  async autoAssign(phone: string): Promise<{ advisor: { nombre: string } }> {
    const { data } = await api.post(`/advisors/auto-assign/${phone}`);
    return data;
  },

  async setOutcome(phone: string, outcome: string): Promise<void> {
    await api.put(`/chats/${phone}/outcome`, { outcome });
  },

  async setStatus(phone: string, status: string): Promise<void> {
    await api.put(`/chats/${phone}/status`, { status });
  },

  async getAISuggestions(phone: string): Promise<string[]> {
    try {
      const { data } = await api.post('/ai/suggest', { remote_phone: phone });
      return data?.suggestions || [];
    } catch {
      return [];
    }
  },
};
