import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  onPageChange: (page: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginTop: 16 }}>
      <button
        className="btn btn-sec btn-sm"
        disabled={currentPage <= 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        Ant
      </button>
      <span style={{ fontSize: 13, color: '#6b7a8d', fontWeight: 500 }}>
        {currentPage}/{totalPages}
      </span>
      <button
        className="btn btn-sec btn-sm"
        disabled={currentPage >= totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Sig
      </button>
      {totalItems !== undefined && (
        <span style={{ fontSize: 12, color: '#9aa5b4', marginLeft: 8 }}>
          {totalItems} total
        </span>
      )}
    </div>
  );
};
