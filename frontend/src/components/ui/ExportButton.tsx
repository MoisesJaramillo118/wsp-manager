import React from 'react';

interface ExportButtonProps {
  onClick: () => void;
  loading?: boolean;
  label?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  onClick,
  loading = false,
  label = 'Exportar',
}) => {
  return (
    <button className="btn btn-sec btn-sm text-xs" onClick={onClick} disabled={loading}>
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {loading ? 'Exportando...' : label}
    </button>
  );
};
