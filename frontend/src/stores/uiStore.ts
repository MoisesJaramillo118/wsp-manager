import { create } from 'zustand';
import { registerUiStore } from '../config/api';

interface UiState {
  activeSection: string;
  sidebarOpen: boolean;
  loadingCount: number;
  dirtyModals: Set<string>;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';

  showSection: (name: string) => void;
  setActiveSection: (name: string) => void;
  toggleSidebar: () => void;
  startLoading: () => void;
  stopLoading: () => void;
  markDirty: (id: string) => void;
  markClean: (id: string) => void;
  isDirty: (id: string) => boolean;
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  activeSection: 'dashboard',
  sidebarOpen: false,
  loadingCount: 0,
  dirtyModals: new Set<string>(),
  connectionStatus: 'disconnected' as const,

  showSection: (name: string) => set({ activeSection: name, sidebarOpen: false }),

  setActiveSection: (name: string) => set({ activeSection: name, sidebarOpen: false }),

  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') =>
    set({ connectionStatus: status }),

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  startLoading: () => set((s) => ({ loadingCount: s.loadingCount + 1 })),

  stopLoading: () =>
    set((s) => ({ loadingCount: Math.max(0, s.loadingCount - 1) })),

  markDirty: (id: string) =>
    set((s) => {
      const next = new Set(s.dirtyModals);
      next.add(id);
      return { dirtyModals: next };
    }),

  markClean: (id: string) =>
    set((s) => {
      const next = new Set(s.dirtyModals);
      next.delete(id);
      return { dirtyModals: next };
    }),

  isDirty: (id: string) => get().dirtyModals.has(id),
}));

// Register with the API interceptors to track loading state
registerUiStore(
  () => useUiStore.getState().startLoading(),
  () => useUiStore.getState().stopLoading()
);
