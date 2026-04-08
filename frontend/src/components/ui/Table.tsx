import React from 'react';

interface TableProps {
  className?: string;
  children: React.ReactNode;
}

export const Table: React.FC<TableProps> = ({ className = '', children }) => {
  return (
    <div className={`table-wrap ${className}`}>
      <table>
        {children}
      </table>
    </div>
  );
};
