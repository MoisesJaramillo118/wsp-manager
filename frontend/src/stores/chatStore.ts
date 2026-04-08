import { create } from 'zustand';
import api from '../config/api';
import type { Conversation, ChatMessage, Advisor, ConversationStatus } from '../types';

interface ChatState {
  conversations: Conversation[];
  currentPhone: string | null;
  messages: ChatMessage[];
  stats: Record<string, number>;
  statusFilter: string;
  search: string;
  page: number;
  hasMore: boolean;
  advisors: Advisor[];

  loadConversations: () => Promise<void>;
  openChat: (phone: string) => Promise<void>;
  sendMessage: (text: string) => Promise<void>;
  assignAdvisor: (phone: string, advisorId: number | null) => Promise<void>;
  setStatus: (phone: string, status: ConversationStatus) => Promise<void>;
  refreshCurrentChat: () => Promise<void>;
  loadMore: () => Promise<void>;
  setChatFilter: (filter: Partial<{ statusFilter: string; search: string }>) => void;
  filterChats: () => Promise<void>;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  currentPhone: null,
  messages: [],
  stats: {},
  statusFilter: '',
  search: '',
  page: 1,
  hasMore: false,
  advisors: [],

  loadConversations: async () => {
    const { statusFilter, search, page } = get();
    const params: Record<string, string | number> = { page, limit: 50 };
    if (statusFilter) params.status = statusFilter;
    if (search) params.search = search;

    const res = await api.get('/chats', { params });
    set({
      conversations: res.data.data ?? res.data.conversations ?? res.data,
      stats: res.data.stats ?? {},
      hasMore: (res.data.page ?? 1) < (res.data.totalPages ?? 1),
    });
  },

  openChat: async (phone: string) => {
    set({ currentPhone: phone, messages: [] });
    const res = await api.get(`/chats/${encodeURIComponent(phone)}`);
    set({ messages: res.data.messages ?? res.data });
  },

  sendMessage: async (text: string) => {
    const phone = get().currentPhone;
    if (!phone) return;
    await api.post(`/chats/${encodeURIComponent(phone)}/send`, { message: text });
    await get().refreshCurrentChat();
  },

  assignAdvisor: async (phone: string, advisorId: number | null) => {
    await api.put(`/chats/${encodeURIComponent(phone)}/assign`, {
      advisor_id: advisorId,
    });
    await get().loadConversations();
  },

  setStatus: async (phone: string, status: ConversationStatus) => {
    await api.put(`/chats/${encodeURIComponent(phone)}/status`, { status });
    await get().loadConversations();
  },

  refreshCurrentChat: async () => {
    const phone = get().currentPhone;
    if (!phone) return;
    const res = await api.get(`/chats/${encodeURIComponent(phone)}`);
    set({ messages: res.data.messages ?? res.data });
  },

  loadMore: async () => {
    set((s) => ({ page: s.page + 1 }));
    await get().loadConversations();
  },

  setChatFilter: (filter) => {
    set({ ...filter, page: 1 });
  },

  filterChats: async () => {
    set({ page: 1 });
    await get().loadConversations();
  },
}));
