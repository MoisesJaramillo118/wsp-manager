import React from 'react';

interface StatCardProps {
  number: number | string;
  label: string;
  borderColor?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  number,
  label,
  borderColor = '#f472b6',
  className = '',
}) => {
  return (
    <div
      className={`stat-card ${className}`}
      style={{ borderLeftColor: borderColor }}
    >
      <div className="stat-num">{number}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
};
