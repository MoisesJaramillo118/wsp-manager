import { create } from 'zustand';
import api from '../config/api';
import type { Contact, ContactGroup } from '../types';

interface ContactState {
  contacts: Contact[];
  total: number;
  page: number;
  search: string;
  grupoFilter: number | null;
  groups: ContactGroup[];

  loadContacts: () => Promise<void>;
  nextPage: () => Promise<void>;
  prevPage: () => Promise<void>;
  loadGroups: () => Promise<void>;
  loadAll: () => Promise<void>;
}

export const useContactStore = create<ContactState>((set, get) => ({
  contacts: [],
  total: 0,
  page: 1,
  search: '',
  grupoFilter: null,
  groups: [],

  loadContacts: async () => {
    const { page, search, grupoFilter } = get();
    const params: Record<string, string | number> = { page, limit: 50 };
    if (search) params.search = search;
    if (grupoFilter) params.grupo_id = grupoFilter;

    const res = await api.get('/contacts', { params });
    set({
      contacts: res.data.data ?? res.data,
      total: res.data.total ?? 0,
    });
  },

  nextPage: async () => {
    set((s) => ({ page: s.page + 1 }));
    await get().loadContacts();
  },

  prevPage: async () => {
    set((s) => ({ page: Math.max(1, s.page - 1) }));
    await get().loadContacts();
  },

  loadGroups: async () => {
    const res = await api.get('/groups');
    set({ groups: res.data.data ?? res.data });
  },

  loadAll: async () => {
    await Promise.all([get().loadContacts(), get().loadGroups()]);
  },
}));
