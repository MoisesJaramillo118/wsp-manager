import React from 'react';
import { Sidebar } from './Sidebar';
import { LoadingBar } from '../ui/LoadingSpinner';
import { ToastContainer } from '../ui/Toast';
import { useUiStore } from '../../stores/uiStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <>
      <LoadingBar />
      <ToastContainer />
      <Sidebar />
      <div
        style={{
          marginLeft: sidebarOpen ? 220 : 0,
          padding: '20px 28px',
          minHeight: '100vh',
          transition: 'margin-left 0.3s',
        }}
      >
        {/* Show hamburger only when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={toggleSidebar}
            title="Mostrar menu"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: '0 8px 12px 0', display: 'flex', alignItems: 'center',
              color: '#6b7a8d',
            }}
          >
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </>
  );
};
