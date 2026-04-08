import React from 'react';

interface SkeletonProps {
  variant?: 'card' | 'table' | 'text' | 'circle';
  width?: string | number;
  height?: string | number;
  count?: number;
  className?: string;
}

const baseStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f0f2f5 25%, #e4e7ec 50%, #f0f2f5 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeletonShimmer 1.5s ease-in-out infinite',
  borderRadius: 8,
};

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
}) => {
  const items = Array.from({ length: count });

  const getStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'card':
        return { ...baseStyle, width: width || '100%', height: height || 120, borderRadius: 12 };
      case 'table':
        return { ...baseStyle, width: width || '100%', height: height || 40, borderRadius: 4 };
      case 'circle':
        return { ...baseStyle, width: width || 40, height: height || 40, borderRadius: '50%' };
      default:
        return { ...baseStyle, width: width || '100%', height: height || 16, borderRadius: 4 };
    }
  };

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((_, i) => (
        <div key={i} style={getStyle()} />
      ))}
    </div>
  );
};
