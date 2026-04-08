import React from 'react';
import { Sidebar } from './Sidebar';
import { LoadingBar } from '../ui/LoadingSpinner';
import { ToastContainer } from '../ui/Toast';
import { useUiStore } from '../../stores/uiStore';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  return (
    <>
      <LoadingBar />
      <ToastContainer />

      <Sidebar />

      {/* Mobile hamburger button */}
      <button
        className="mobile-toggle"
        onClick={toggleSidebar}
        style={{
          position: 'fixed', top: 12, left: 12, zIndex: 60,
          background: '#fff', padding: 8, borderRadius: 8,
          boxShadow: '0 1px 4px rgba(0,0,0,0.12)', border: 'none',
          cursor: 'pointer', display: 'none',
        }}
      >
        <svg width="22" height="22" fill="none" stroke="#2d3748" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      <div className="main" id="main-content">
        {children}
      </div>
    </>
  );
};
