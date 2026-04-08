import React, { useEffect, useCallback } from 'react';
import { useConfirmClose } from '../../hooks/useConfirmClose';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  modalId?: string;
  dirty?: boolean;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  modalId = 'modal',
  dirty,
  title,
  children,
  maxWidth = '520px',
}) => {
  const { markDirty, markClean, confirmClose } = useConfirmClose(modalId);

  // Sync external dirty prop with the useConfirmClose hook
  useEffect(() => {
    if (dirty) {
      markDirty();
    } else {
      markClean();
    }
  }, [dirty, markDirty, markClean]);

  const handleClose = useCallback(() => {
    if (confirmClose()) {
      onClose();
    }
  }, [confirmClose, onClose]);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, handleClose]);

  return (
    <div
      className={`modal-overlay ${open ? 'show' : ''}`}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div className="modal" style={{ maxWidth }}>
        {title && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#2d3748', margin: 0 }}>{title}</h3>
            <button
              onClick={handleClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#9aa5b4' }}
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};
